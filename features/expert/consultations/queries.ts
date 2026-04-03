import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ExpertAssignedConsultationEntry,
  ExpertPhase2VoteScore,
  ExpertPhase2VotableCommentEntry,
  ExpertConsultationSectionEntry,
  ExpertSectionCommentEntry,
} from "@/features/expert/consultations/shared";

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

type ConsultationParticipantLookup = {
  consultation_id: string;
};

type ExpertPhase2CommentLookup = {
  id: string;
  consultation_id: string;
  section_id: string;
  title: string;
  body_text: string | null;
  is_active: boolean;
  created_at: string;
};

type Phase2VoteLookup = {
  comment_id: string;
  score: ExpertPhase2VoteScore;
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

export async function getExpertPhase2VotableComments(
  profileId: string,
  consultationId: string,
) {
  const supabase = createAdminSupabaseClient();
  const assignmentQuery = supabase
    .from("consultation_participants")
    .select("consultation_id")
    .eq("consultation_id", consultationId)
    .eq("profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle<ConsultationParticipantLookup>() as unknown as Promise<{
    data: ConsultationParticipantLookup | null;
    error: AppError | null;
  }>;
  const commentsQuery = supabase
    .from("expert_section_comments")
    .select(
      [
        "id",
        "consultation_id",
        "section_id",
        "title",
        "body_text",
        "is_active",
        "created_at",
      ].join(", "),
    )
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .returns<ExpertPhase2CommentLookup[]>() as unknown as Promise<{
    data: ExpertPhase2CommentLookup[] | null;
    error: AppError | null;
  }>;
  const votesQuery = supabase
    .from("expert_section_comment_votes")
    .select("comment_id, score")
    .eq("consultation_id", consultationId)
    .eq("voter_profile_id", profileId)
    .returns<Phase2VoteLookup[]>() as unknown as Promise<{
    data: Phase2VoteLookup[] | null;
    error: AppError | null;
  }>;

  const [
    { data: assignment, error: assignmentError },
    { data: phase2Comments, error: phase2CommentsError },
    { data: phase2Votes, error: phase2VotesError },
  ] = await Promise.all([assignmentQuery, commentsQuery, votesQuery]);

  if (assignmentError) {
    throw assignmentError;
  }

  if (!assignment) {
    return [] as ExpertPhase2VotableCommentEntry[];
  }

  if (phase2CommentsError) {
    throw phase2CommentsError;
  }

  if (phase2VotesError && !isMissingRelationError(phase2VotesError, "expert_section_comment_votes")) {
    throw phase2VotesError;
  }

  const comments = phase2Comments ?? [];

  if (comments.length === 0) {
    return [] as ExpertPhase2VotableCommentEntry[];
  }

  const currentVoteByItemId = new Map(
    (phase2Votes ?? []).map((vote) => [vote.comment_id, vote.score]),
  );

  return comments.map((comment) => ({
    id: comment.id,
    consultation_id: comment.consultation_id,
    section_id: comment.section_id,
    display_title: comment.title,
    display_body: comment.body_text ?? "",
    order_index: null,
    current_vote_score: currentVoteByItemId.get(comment.id) ?? null,
  }));
}
