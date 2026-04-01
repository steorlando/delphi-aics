import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AdminConsultationCommentEntry,
  ConsultationDirectoryEntry,
  ConsultationParticipantEntry,
  DocumentSectionEntry,
} from "@/features/admin/consultations/shared";

type AppError = {
  message: string;
};

export async function getConsultationsDirectory() {
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from("consultations")
    .select(
      [
        "id",
        "title",
        "description",
        "current_state",
        "phase_1_opens_at",
        "phase_1_closes_at",
        "phase_2_opens_at",
        "phase_2_closes_at",
        "document_title",
        "document_description",
        "is_active",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .order("updated_at", { ascending: false })
    .returns<ConsultationDirectoryEntry[]>() as unknown as Promise<{
    data: ConsultationDirectoryEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getConsultationById(consultationId: string) {
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from("consultations")
    .select(
      [
        "id",
        "title",
        "description",
        "current_state",
        "phase_1_opens_at",
        "phase_1_closes_at",
        "phase_2_opens_at",
        "phase_2_closes_at",
        "document_title",
        "document_description",
        "is_active",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", consultationId)
    .maybeSingle<ConsultationDirectoryEntry>() as unknown as Promise<{
    data: ConsultationDirectoryEntry | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function getDocumentSectionsByConsultationId(consultationId: string) {
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from("document_sections")
    .select(
      [
        "id",
        "consultation_id",
        "title",
        "slug",
        "order_index",
        "body_text",
        "reference_label",
        "is_active",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("consultation_id", consultationId)
    .order("order_index", { ascending: true })
    .returns<DocumentSectionEntry[]>() as unknown as Promise<{
    data: DocumentSectionEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getConsultationParticipantsByConsultationId(
  consultationId: string,
) {
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from("consultation_participants")
    .select(
      [
        "id",
        "consultation_id",
        "profile_id",
        "is_active",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true })
    .returns<ConsultationParticipantEntry[]>() as unknown as Promise<{
    data: ConsultationParticipantEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getExpertSectionCommentsByConsultationId(
  consultationId: string,
) {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("expert_section_comments")
    .select(
      [
        "id",
        "consultation_id",
        "section_id",
        "expert_profile_id",
        "title",
        "body_text",
        "priority",
        "is_active",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<AdminConsultationCommentEntry[]>() as unknown as Promise<{
    data: AdminConsultationCommentEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}
