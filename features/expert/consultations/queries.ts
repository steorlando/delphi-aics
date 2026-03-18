import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ExpertAssignedConsultationEntry,
  ExpertConsultationSectionEntry,
  ExpertSectionCommentEntry,
} from "@/features/expert/consultations/shared";

type AppError = {
  message: string;
};

type ConsultationParticipantLookup = {
  consultation_id: string;
};

const consultationSelect = [
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
].join(", ");

export async function getExpertAssignedConsultations(profileId: string) {
  const supabase = await createServerSupabaseClient();
  const participantLinksQuery = supabase
    .from("consultation_participants")
    .select("consultation_id")
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .returns<ConsultationParticipantLookup[]>() as unknown as Promise<{
    data: ConsultationParticipantLookup[] | null;
    error: AppError | null;
  }>;
  const { data: participantLinks, error: participantLinksError } = await participantLinksQuery;

  if (participantLinksError) {
    throw participantLinksError;
  }

  const consultationIds = Array.from(
    new Set((participantLinks ?? []).map((link) => link.consultation_id)),
  );

  if (consultationIds.length === 0) {
    return [] as ExpertAssignedConsultationEntry[];
  }

  const consultationsQuery = supabase
    .from("consultations")
    .select(consultationSelect)
    .in("id", consultationIds)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .returns<ExpertAssignedConsultationEntry[]>() as unknown as Promise<{
    data: ExpertAssignedConsultationEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await consultationsQuery;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getExpertAssignedConsultationById(
  profileId: string,
  consultationId: string,
) {
  const supabase = await createServerSupabaseClient();
  const participantLinkQuery = supabase
    .from("consultation_participants")
    .select("consultation_id")
    .eq("profile_id", profileId)
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .maybeSingle<ConsultationParticipantLookup>() as unknown as Promise<{
    data: ConsultationParticipantLookup | null;
    error: AppError | null;
  }>;
  const { data: participantLink, error: participantLinkError } = await participantLinkQuery;

  if (participantLinkError) {
    throw participantLinkError;
  }

  if (!participantLink) {
    return null;
  }

  const consultationQuery = supabase
    .from("consultations")
    .select(consultationSelect)
    .eq("id", consultationId)
    .eq("is_active", true)
    .maybeSingle<ExpertAssignedConsultationEntry>() as unknown as Promise<{
    data: ExpertAssignedConsultationEntry | null;
    error: AppError | null;
  }>;
  const { data, error } = await consultationQuery;

  if (error) {
    throw error;
  }

  return data;
}

export async function getExpertConsultationSections(consultationId: string) {
  const supabase = createAdminSupabaseClient();
  const sectionsQuery = supabase
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
    .eq("is_active", true)
    .order("order_index", { ascending: true })
    .returns<ExpertConsultationSectionEntry[]>() as unknown as Promise<{
    data: ExpertConsultationSectionEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await sectionsQuery;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getExpertSectionComments(
  profileId: string,
  consultationId: string,
) {
  const supabase = createAdminSupabaseClient();
  const commentsQuery = supabase
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
    .eq("expert_profile_id", profileId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<ExpertSectionCommentEntry[]>() as unknown as Promise<{
    data: ExpertSectionCommentEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await commentsQuery;

  if (error) {
    throw error;
  }

  return data ?? [];
}
