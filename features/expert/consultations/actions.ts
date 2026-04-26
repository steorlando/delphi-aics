"use server";

import { revalidatePath } from "next/cache";
import { type ConsultationState } from "@/features/admin/consultations/shared";
import {
  canExpertSubmitSectionComments,
  expertCommentPriorityLevels,
  type ExpertPhase2VoteScore,
  type ExpertSectionCommentPriority,
} from "@/features/expert/consultations/shared";
import { getAuthContext } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type CreateExpertSectionCommentFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type SaveExpertPhase2VoteFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type SaveExpertPhase2VoteNoteFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type AppError = {
  code?: string;
  message: string;
};

function isMissingRelationError(error: AppError | null, relationName: string) {
  if (!error?.message) {
    return false;
  }

  return error.message.includes(`Could not find the table 'public.${relationName}'`);
}

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

type ExpertSectionCommentsSoftDeleteBuilder = {
  update(values: {
    is_active: boolean;
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

type Phase2VotesInsertBuilder = {
  insert(values: {
    consultation_id: string;
    comment_id: string;
    voter_profile_id: string;
    score: ExpertPhase2VoteScore;
  }): Promise<{
    error: AppError | null;
  }>;
};

type Phase2VotesSelectBuilder = {
  select(columns: string): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle<T>(): Promise<{
            data: T | null;
            error: AppError | null;
          }>;
        };
      };
    };
  };
};

type Phase2VotesUpdateBuilder = {
  update(values: {
    score: ExpertPhase2VoteScore;
    updated_at: string;
  }): {
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

type Phase2VoteNotesUpsertBuilder = {
  upsert(
    values: {
      consultation_id: string;
      comment_id: string;
      author_profile_id: string;
      body_text: string;
      updated_at: string;
    },
    options: {
      onConflict: string;
    },
  ): {
    select(columns: string): {
      maybeSingle<T>(): Promise<{
        data: T | null;
        error: AppError | null;
      }>;
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

function normalizePhase2VoteScore(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const numericValue = Number.parseInt(value, 10);

  if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 4) {
    return null;
  }

  return numericValue as ExpertPhase2VoteScore;
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

export async function deleteExpertSectionCommentAction(
  _previousState: CreateExpertSectionCommentFormState,
  formData: FormData,
): Promise<CreateExpertSectionCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "expert") {
    return {
      status: "error",
      message: "Solo gli esperti autenticati possono eliminare commenti.",
    };
  }

  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));

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

  const [
    { data: assignment, error: assignmentError },
    { data: consultation, error: consultationError },
  ] = await Promise.all([assignmentQuery, consultationQuery]);

  if (assignmentError || !assignment) {
    return {
      status: "error",
      message:
        assignmentError?.message ||
        "Non puoi eliminare commenti per una consultazione non assegnata.",
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
        "L'eliminazione dei commenti e' disponibile solo quando la consultazione e' nella fase Commenti.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsSoftDeleteBuilder;
  const deleteQuery = commentsTable
    .update({
      is_active: false,
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
  const { data, error } = await deleteQuery;

  if (error || !data) {
    return {
      status: "error",
      message: error?.message || "Impossibile eliminare il commento.",
    };
  }

  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento eliminato correttamente.",
  };
}

export async function saveExpertPhase2VoteAction(
  _previousState: SaveExpertPhase2VoteFormState,
  formData: FormData,
): Promise<SaveExpertPhase2VoteFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "expert") {
    return {
      status: "error",
      message: "Solo gli esperti autenticati possono votare i commenti.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const commentId = normalizeText(formData.get("commentId"));
  const score = normalizePhase2VoteScore(formData.get("score"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!commentId) {
    return {
      status: "error",
      message: "Commento da votare non valido.",
    };
  }

  if (score === null) {
    return {
      status: "error",
      message: "Seleziona un valore valido tra 0 e 4.",
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
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, is_active")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{ id: string; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; is_active: boolean } | null;
    error: AppError | null;
  }>;
  const existingVoteQuery = (supabase.from("expert_section_comment_votes") as unknown as Phase2VotesSelectBuilder)
    .select("id")
    .eq("consultation_id", consultationId)
    .eq("comment_id", commentId)
    .eq("voter_profile_id", profile.id)
    .maybeSingle<{ id: string }>();

  const [
    { data: assignment, error: assignmentError },
    { data: consultation, error: consultationError },
    { data: comment, error: commentError },
    { data: existingVote, error: existingVoteError },
  ] = await Promise.all([
    assignmentQuery,
    consultationQuery,
    commentQuery,
    existingVoteQuery,
  ]);

  if (assignmentError || !assignment) {
    return {
      status: "error",
      message:
        assignmentError?.message ||
        "Non puoi votare i commenti di una consultazione non assegnata.",
    };
  }

  if (consultationError || !consultation || !consultation.is_active) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (consultation.current_state !== "phase_2_open") {
    return {
      status: "error",
      message:
        "La votazione e' disponibile solo quando la consultazione e' nella fase Votazione commenti.",
    };
  }

  if (commentError || !comment || !comment.is_active) {
    return {
      status: "error",
      message:
        commentError?.message ||
        "Il commento selezionato non e' disponibile per la votazione.",
    };
  }

  if (existingVoteError) {
    if (isMissingRelationError(existingVoteError, "expert_section_comment_votes")) {
      return {
        status: "error",
        message:
          "La registrazione dei voti non e' ancora attiva in questo ambiente. Applica prima la migrazione del database dedicata ai voti di fase 2.",
      };
    }

    return {
      status: "error",
      message: existingVoteError.message || "Impossibile verificare il voto corrente.",
    };
  }

  if (existingVote) {
    const votesTable = supabase.from("expert_section_comment_votes") as unknown as Phase2VotesUpdateBuilder;
    const updateQuery = votesTable
      .update({
        score,
        updated_at: new Date().toISOString(),
      })
      .eq("consultation_id", consultationId)
      .eq("comment_id", commentId)
      .eq("voter_profile_id", profile.id)
      .select("id")
      .maybeSingle<{ id: string }>() as unknown as Promise<{
      data: { id: string } | null;
      error: AppError | null;
    }>;
    const { data, error } = await updateQuery;

    if (error || !data) {
      if (isMissingRelationError(error, "expert_section_comment_votes")) {
        return {
          status: "error",
          message:
            "La registrazione dei voti non e' ancora attiva in questo ambiente. Applica prima la migrazione del database dedicata ai voti di fase 2.",
        };
      }

      return {
        status: "error",
        message: error?.message || "Impossibile aggiornare il voto.",
      };
    }
  } else {
    const votesTable = supabase.from("expert_section_comment_votes") as unknown as Phase2VotesInsertBuilder;
    const { error } = await votesTable.insert({
      consultation_id: consultationId,
      comment_id: commentId,
      voter_profile_id: profile.id,
      score,
    });

    if (error) {
      if (isMissingRelationError(error, "expert_section_comment_votes")) {
        return {
          status: "error",
          message:
            "La registrazione dei voti non e' ancora attiva in questo ambiente. Applica prima la migrazione del database dedicata ai voti di fase 2.",
        };
      }

      return {
        status: "error",
        message: error.message || "Impossibile salvare il voto.",
      };
    }
  }

  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Valutazione salvata correttamente.",
  };
}

export async function saveExpertPhase2VoteNoteAction(
  _previousState: SaveExpertPhase2VoteNoteFormState,
  formData: FormData,
): Promise<SaveExpertPhase2VoteNoteFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "expert") {
    return {
      status: "error",
      message: "Solo gli esperti autenticati possono commentare i voti.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const commentId = normalizeText(formData.get("commentId"));
  const bodyText = normalizeText(formData.get("bodyText"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!commentId) {
    return {
      status: "error",
      message: "Commento da commentare non valido.",
    };
  }

  if (!bodyText) {
    return {
      status: "error",
      message: "Inserisci una nota prima di salvare.",
    };
  }

  if (bodyText.length > 2500) {
    return {
      status: "error",
      message: "La nota puo' contenere al massimo 2500 caratteri.",
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
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, is_active")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{ id: string; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; is_active: boolean } | null;
    error: AppError | null;
  }>;

  const [
    { data: assignment, error: assignmentError },
    { data: consultation, error: consultationError },
    { data: comment, error: commentError },
  ] = await Promise.all([assignmentQuery, consultationQuery, commentQuery]);

  if (assignmentError || !assignment) {
    return {
      status: "error",
      message:
        assignmentError?.message ||
        "Non puoi commentare i voti di una consultazione non assegnata.",
    };
  }

  if (consultationError || !consultation || !consultation.is_active) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (consultation.current_state !== "phase_2_open") {
    return {
      status: "error",
      message:
        "I commenti alla votazione sono modificabili solo quando la consultazione e' nella fase Votazione commenti.",
    };
  }

  if (commentError || !comment || !comment.is_active) {
    return {
      status: "error",
      message:
        commentError?.message ||
        "Il commento selezionato non e' disponibile per la votazione.",
    };
  }

  const voteNotesTable = supabase.from(
    "expert_section_comment_vote_notes",
  ) as unknown as Phase2VoteNotesUpsertBuilder;
  const saveQuery = voteNotesTable
    .upsert(
      {
        consultation_id: consultationId,
        comment_id: commentId,
        author_profile_id: profile.id,
        body_text: bodyText,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "comment_id,author_profile_id",
      },
    )
    .select("id")
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await saveQuery;

  if (error || !data) {
    if (isMissingRelationError(error, "expert_section_comment_vote_notes")) {
      return {
        status: "error",
        message:
          "La registrazione dei commenti ai voti non e' ancora attiva in questo ambiente. Applica prima la migrazione dedicata alle note di fase 2.",
      };
    }

    return {
      status: "error",
      message: error?.message || "Impossibile salvare la nota.",
    };
  }

  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento salvato correttamente.",
  };
}
