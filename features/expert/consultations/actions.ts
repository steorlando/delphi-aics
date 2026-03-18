"use server";

import { revalidatePath } from "next/cache";
import { type ConsultationState } from "@/features/admin/consultations/shared";
import {
  canExpertSubmitSectionComments,
  expertCommentPriorityLevels,
  type ExpertSectionCommentPriority,
} from "@/features/expert/consultations/shared";
import { getAuthContext } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type CreateExpertSectionCommentFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type AppError = {
  code?: string;
  message: string;
};

type ExpertSectionCommentsInsertBuilder = {
  insert(values: {
    consultation_id: string;
    section_id: string;
    expert_profile_id: string;
    title: string;
    body_text: string | null;
    priority: ExpertSectionCommentPriority;
    is_active: boolean;
  }): Promise<{
    error: AppError | null;
  }>;
};

type ExpertSectionCommentsUpdateBuilder = {
  update(values: {
    title: string;
    body_text: string | null;
    priority: ExpertSectionCommentPriority;
    updated_at: string;
  }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): {
            select(columns: string): {
              maybeSingle<T>(): Promise<{
                data: T | null;
                error: AppError | null;
              }>;
            };
          };
        };
      };
    };
  };
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizeCommentPriority(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value) as ExpertSectionCommentPriority;

  if (!expertCommentPriorityLevels.includes(normalized)) {
    return null;
  }

  return normalized;
}

function getExpertConsultationPath(consultationId: string) {
  return `/app/${consultationId}`;
}

export async function createExpertSectionCommentAction(
  _previousState: CreateExpertSectionCommentFormState,
  formData: FormData,
): Promise<CreateExpertSectionCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "expert") {
    return {
      status: "error",
      message: "Solo gli esperti autenticati possono inviare commenti.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));
  const title = normalizeText(formData.get("title"));
  const bodyText = normalizeOptionalText(formData.get("bodyText"));
  const priority = normalizeCommentPriority(formData.get("priority"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!sectionId) {
    return {
      status: "error",
      message: "Seleziona una sezione prima di inserire un commento.",
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo del commento e' obbligatorio.",
    };
  }

  if (!priority) {
    return {
      status: "error",
      message: "Seleziona una priorita' valida: low, medium o high.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const assignmentQuery = supabase
    .from("consultation_participants")
    .select("consultation_id")
    .eq("consultation_id", consultationId)
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .maybeSingle<{ consultation_id: string }>() as unknown as Promise<{
    data: { consultation_id: string } | null;
    error: AppError | null;
  }>;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, current_state, is_active")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; current_state: ConsultationState; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; current_state: ConsultationState; is_active: boolean } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;

  const [
    { data: assignment, error: assignmentError },
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
  ] = await Promise.all([assignmentQuery, consultationQuery, sectionQuery]);

  if (assignmentError || !assignment) {
    return {
      status: "error",
      message:
        assignmentError?.message ||
        "Non puoi inserire commenti per una consultazione non assegnata.",
    };
  }

  if (consultationError || !consultation || !consultation.is_active) {
    return {
      status: "error",
      message:
        consultationError?.message ||
        "Consultazione non disponibile.",
    };
  }

  if (!canExpertSubmitSectionComments(consultation.current_state)) {
    return {
      status: "error",
      message:
        "L'inserimento di nuovi commenti e' disponibile solo quando la consultazione e' nella fase Commenti.",
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message:
        sectionError?.message ||
        "La sezione selezionata non e' disponibile.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsInsertBuilder;
  const { error } = await commentsTable.insert({
    consultation_id: consultationId,
    section_id: sectionId,
    expert_profile_id: profile.id,
    title,
    body_text: bodyText,
    priority,
    is_active: true,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Impossibile salvare il commento.",
    };
  }

  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento salvato correttamente.",
  };
}

export async function updateExpertSectionCommentAction(
  _previousState: CreateExpertSectionCommentFormState,
  formData: FormData,
): Promise<CreateExpertSectionCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "expert") {
    return {
      status: "error",
      message: "Solo gli esperti autenticati possono modificare commenti.",
    };
  }

  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));
  const title = normalizeText(formData.get("title"));
  const bodyText = normalizeOptionalText(formData.get("bodyText"));
  const priority = normalizeCommentPriority(formData.get("priority"));

  if (!commentId) {
    return {
      status: "error",
      message: "Commento non valido.",
    };
  }

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!sectionId) {
    return {
      status: "error",
      message: "Sezione non valida.",
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo del commento e' obbligatorio.",
    };
  }

  if (!priority) {
    return {
      status: "error",
      message: "Seleziona una priorita' valida: low, medium o high.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const assignmentQuery = supabase
    .from("consultation_participants")
    .select("consultation_id")
    .eq("consultation_id", consultationId)
    .eq("profile_id", profile.id)
    .eq("is_active", true)
    .maybeSingle<{ consultation_id: string }>() as unknown as Promise<{
    data: { consultation_id: string } | null;
    error: AppError | null;
  }>;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, current_state, is_active")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; current_state: ConsultationState; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; current_state: ConsultationState; is_active: boolean } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;

  const [
    { data: assignment, error: assignmentError },
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
  ] = await Promise.all([assignmentQuery, consultationQuery, sectionQuery]);

  if (assignmentError || !assignment) {
    return {
      status: "error",
      message:
        assignmentError?.message ||
        "Non puoi modificare commenti per una consultazione non assegnata.",
    };
  }

  if (consultationError || !consultation || !consultation.is_active) {
    return {
      status: "error",
      message:
        consultationError?.message ||
        "Consultazione non disponibile.",
    };
  }

  if (!canExpertSubmitSectionComments(consultation.current_state)) {
    return {
      status: "error",
      message:
        "La modifica dei commenti e' disponibile solo quando la consultazione e' nella fase Commenti.",
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message:
        sectionError?.message ||
        "La sezione selezionata non e' disponibile.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsUpdateBuilder;
  const updateQuery = commentsTable
    .update({
      title,
      body_text: bodyText,
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("expert_profile_id", profile.id)
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .select("id")
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await updateQuery;

  if (error || !data) {
    return {
      status: "error",
      message: error?.message || "Impossibile aggiornare il commento.",
    };
  }

  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento aggiornato correttamente.",
  };
}
