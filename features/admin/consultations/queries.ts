import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AdminConsultationCommentEntry,
  ConsultationDirectoryEntry,
  ConsultationParticipantEntry,
  DocumentSectionEntry,
} from "@/features/admin/consultations/shared";

type AppError = {
  code?: string;
  message: string;
};

type AdminConsultationCommentLookup = {
  id: string;
  consultation_id: string;
  section_id: string;
  expert_profile_id: string;
  title: string;
  body_text: string | null;
  priority: AdminConsultationCommentEntry["priority"];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminCommentVoteLookup = {
  comment_id: string;
  score: number;
};

type AdminCommentPhase2ReviewLookup = {
  id: string;
  is_phase_2_reviewed: boolean;
};

function isMissingRelationError(error: AppError | null, relationName: string) {
  if (!error?.message) {
    return false;
  }

  return error.message.includes(`Could not find the table 'public.${relationName}'`);
}

function isMissingColumnError(
  error: AppError | null,
  relationName: string,
  columnName: string,
) {
  if (!error?.message) {
    return false;
  }

  return error.message.includes(`'${columnName}' column of '${relationName}'`)
    || error.message.includes(`${relationName}.${columnName}`);
}

function roundVoteAverage(value: number) {
  return Math.round(value * 100) / 100;
}

async function getCommentVoteStatsByConsultationId(consultationId: string) {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("expert_section_comment_votes")
    .select("comment_id, score")
    .eq("consultation_id", consultationId)
    .returns<AdminCommentVoteLookup[]>() as unknown as Promise<{
    data: AdminCommentVoteLookup[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error, "expert_section_comment_votes")) {
      return new Map<string, { vote_count: number; average_vote_score: number | null }>();
    }

    throw error;
  }

  const aggregates = (data ?? []).reduce<Map<string, { count: number; sum: number }>>(
    (map, vote) => {
      const current = map.get(vote.comment_id) ?? { count: 0, sum: 0 };
      current.count += 1;
      current.sum += vote.score;
      map.set(vote.comment_id, current);
      return map;
    },
    new Map<string, { count: number; sum: number }>(),
  );

  return new Map(
    Array.from(aggregates.entries()).map(([commentId, aggregate]) => [
      commentId,
      {
        vote_count: aggregate.count,
        average_vote_score:
          aggregate.count > 0 ? roundVoteAverage(aggregate.sum / aggregate.count) : null,
      },
    ]),
  );
}

async function getCommentPhase2ReviewStatusByConsultationId(consultationId: string) {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("expert_section_comments")
    .select("id, is_phase_2_reviewed")
    .eq("consultation_id", consultationId)
    .returns<AdminCommentPhase2ReviewLookup[]>() as unknown as Promise<{
    data: AdminCommentPhase2ReviewLookup[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    if (isMissingColumnError(error, "expert_section_comments", "is_phase_2_reviewed")) {
      return new Map<string, boolean>();
    }

    throw error;
  }

  return new Map((data ?? []).map((comment) => [comment.id, comment.is_phase_2_reviewed]));
}

function mapCommentsWithVoteStats(
  comments: AdminConsultationCommentLookup[],
  voteStatsByCommentId: Map<string, { vote_count: number; average_vote_score: number | null }>,
  phase2ReviewStatusByCommentId: Map<string, boolean>,
) {
  return comments.map<AdminConsultationCommentEntry>((comment) => {
    const voteStats = voteStatsByCommentId.get(comment.id);

    return {
      ...comment,
      is_phase_2_reviewed: phase2ReviewStatusByCommentId.get(comment.id) ?? false,
      vote_count: voteStats?.vote_count ?? 0,
      average_vote_score: voteStats?.average_vote_score ?? null,
    };
  });
}

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
    .returns<AdminConsultationCommentLookup[]>() as unknown as Promise<{
    data: AdminConsultationCommentLookup[] | null;
    error: AppError | null;
  }>;
  const [{ data, error }, voteStatsByCommentId, phase2ReviewStatusByCommentId] = await Promise.all([
    query,
    getCommentVoteStatsByConsultationId(consultationId),
    getCommentPhase2ReviewStatusByConsultationId(consultationId),
  ]);

  if (error) {
    throw error;
  }

  return mapCommentsWithVoteStats(
    data ?? [],
    voteStatsByCommentId,
    phase2ReviewStatusByCommentId,
  );
}

export async function getInactiveExpertSectionCommentsByConsultationId(
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
    .eq("is_active", false)
    .order("updated_at", { ascending: false })
    .returns<AdminConsultationCommentLookup[]>() as unknown as Promise<{
    data: AdminConsultationCommentLookup[] | null;
    error: AppError | null;
  }>;
  const [{ data, error }, voteStatsByCommentId, phase2ReviewStatusByCommentId] = await Promise.all([
    query,
    getCommentVoteStatsByConsultationId(consultationId),
    getCommentPhase2ReviewStatusByConsultationId(consultationId),
  ]);

  if (error) {
    throw error;
  }

  return mapCommentsWithVoteStats(
    data ?? [],
    voteStatsByCommentId,
    phase2ReviewStatusByCommentId,
  );
}
