import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AdminConsultationCommentEntry,
  AdminPhase2VoteNoteEntry,
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
  display_order: number | null;
  created_at: string;
  updated_at: string;
};

type AdminConsultationCommentFallbackLookup = Omit<
  AdminConsultationCommentLookup,
  "display_order"
>;

type AdminCommentVoteLookup = {
  comment_id: string;
  score: number;
};

type AdminCommentPhase2ReviewLookup = {
  id: string;
  is_phase_2_reviewed: boolean;
};

type AdminPhase2VoteNoteLookup = AdminPhase2VoteNoteEntry;

type ConsultationCommentSummaryLookup = {
  consultation_id: string;
  expert_profile_id: string;
  created_at: string;
};

type ConsultationParticipantSummaryLookup = {
  consultation_id: string;
  profile_id: string;
  is_active: boolean;
};

type ConsultationParticipantProfileLookup = {
  id: string;
  must_reset_password: boolean;
};

type ConsultationVoteSummaryLookup = {
  consultation_id: string;
  voter_profile_id: string;
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

async function getCommentSummariesByConsultationId() {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("expert_section_comments")
    .select("consultation_id, expert_profile_id, created_at")
    .returns<ConsultationCommentSummaryLookup[]>() as unknown as Promise<{
    data: ConsultationCommentSummaryLookup[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error, "expert_section_comments")) {
      return new Map<
        string,
        {
          comment_count: number;
          commenting_expert_count: number;
          latest_comment_created_at: string | null;
        }
      >();
    }

    throw error;
  }

  return (data ?? []).reduce<
    Map<
      string,
      {
        comment_count: number;
        commenting_expert_ids: Set<string>;
        commenting_expert_count: number;
        latest_comment_created_at: string | null;
      }
    >
  >((map, comment) => {
    const current = map.get(comment.consultation_id) ?? {
      comment_count: 0,
      commenting_expert_ids: new Set<string>(),
      commenting_expert_count: 0,
      latest_comment_created_at: null,
    };
    current.comment_count += 1;
    current.commenting_expert_ids.add(comment.expert_profile_id);
    current.commenting_expert_count = current.commenting_expert_ids.size;

    if (
      !current.latest_comment_created_at
      || comment.created_at > current.latest_comment_created_at
    ) {
      current.latest_comment_created_at = comment.created_at;
    }

    map.set(comment.consultation_id, current);
    return map;
  }, new Map());
}

async function getParticipantSummariesByConsultationId() {
  const supabase = createAdminSupabaseClient();
  const participantsQuery = supabase
    .from("consultation_participants")
    .select("consultation_id, profile_id, is_active")
    .eq("is_active", true)
    .returns<ConsultationParticipantSummaryLookup[]>() as unknown as Promise<{
    data: ConsultationParticipantSummaryLookup[] | null;
    error: AppError | null;
  }>;
  const { data: participants, error: participantsError } = await participantsQuery;

  if (participantsError) {
    throw participantsError;
  }

  const profileIds = Array.from(
    new Set((participants ?? []).map((participant) => participant.profile_id)),
  );

  const profilesById = new Map<string, ConsultationParticipantProfileLookup>();

  if (profileIds.length > 0) {
    const profilesQuery = supabase
      .from("profiles")
      .select("id, must_reset_password")
      .in("id", profileIds)
      .eq("role", "expert")
      .returns<ConsultationParticipantProfileLookup[]>() as unknown as Promise<{
      data: ConsultationParticipantProfileLookup[] | null;
      error: AppError | null;
    }>;
    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw profilesError;
    }

    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, profile);
    }
  }

  return (participants ?? []).reduce<
    Map<
      string,
      {
        invited_expert_ids: Set<string>;
        first_access_expert_ids: Set<string>;
        invited_expert_count: number;
        first_access_expert_count: number;
      }
    >
  >((map, participant) => {
    const profile = profilesById.get(participant.profile_id);

    if (!profile) {
      return map;
    }

    const current = map.get(participant.consultation_id) ?? {
      invited_expert_ids: new Set<string>(),
      first_access_expert_ids: new Set<string>(),
      invited_expert_count: 0,
      first_access_expert_count: 0,
    };

    current.invited_expert_ids.add(participant.profile_id);

    if (!profile.must_reset_password) {
      current.first_access_expert_ids.add(participant.profile_id);
    }

    current.invited_expert_count = current.invited_expert_ids.size;
    current.first_access_expert_count = current.first_access_expert_ids.size;
    map.set(participant.consultation_id, current);
    return map;
  }, new Map());
}

async function getVoteSummariesByConsultationId() {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("expert_section_comment_votes")
    .select("consultation_id, voter_profile_id")
    .returns<ConsultationVoteSummaryLookup[]>() as unknown as Promise<{
    data: ConsultationVoteSummaryLookup[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error, "expert_section_comment_votes")) {
      return new Map<string, { voting_expert_count: number; vote_count: number }>();
    }

    throw error;
  }

  return (data ?? []).reduce<
    Map<
      string,
      {
        voting_expert_ids: Set<string>;
        voting_expert_count: number;
        vote_count: number;
      }
    >
  >((map, vote) => {
    const current = map.get(vote.consultation_id) ?? {
      voting_expert_ids: new Set<string>(),
      voting_expert_count: 0,
      vote_count: 0,
    };
    current.voting_expert_ids.add(vote.voter_profile_id);
    current.voting_expert_count = current.voting_expert_ids.size;
    current.vote_count += 1;
    map.set(vote.consultation_id, current);
    return map;
  }, new Map());
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

async function getCommentVoteNotesByConsultationId(consultationId: string) {
  const supabase = createAdminSupabaseClient();
  const query = supabase
    .from("expert_section_comment_vote_notes")
    .select("id, comment_id, author_profile_id, body_text, created_at, updated_at")
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true })
    .returns<AdminPhase2VoteNoteLookup[]>() as unknown as Promise<{
    data: AdminPhase2VoteNoteLookup[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error, "expert_section_comment_vote_notes")) {
      return new Map<string, AdminPhase2VoteNoteEntry[]>();
    }

    throw error;
  }

  const notesByCommentId = new Map<string, AdminPhase2VoteNoteEntry[]>();

  for (const note of data ?? []) {
    const commentNotes = notesByCommentId.get(note.comment_id) ?? [];
    commentNotes.push(note);
    notesByCommentId.set(note.comment_id, commentNotes);
  }

  return notesByCommentId;
}

function mapCommentsWithVoteStats(
  comments: AdminConsultationCommentLookup[],
  voteStatsByCommentId: Map<string, { vote_count: number; average_vote_score: number | null }>,
  phase2ReviewStatusByCommentId: Map<string, boolean>,
  voteNotesByCommentId?: Map<string, AdminPhase2VoteNoteEntry[]>,
) {
  return comments.map<AdminConsultationCommentEntry>((comment) => {
    const voteStats = voteStatsByCommentId.get(comment.id);

    return {
      ...comment,
      is_phase_2_reviewed: phase2ReviewStatusByCommentId.get(comment.id) ?? false,
      vote_count: voteStats?.vote_count ?? 0,
      average_vote_score: voteStats?.average_vote_score ?? null,
      phase_2_vote_notes: voteNotesByCommentId?.get(comment.id) ?? [],
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
  const [
    { data, error },
    commentSummariesByConsultationId,
    participantSummariesByConsultationId,
    voteSummariesByConsultationId,
  ] = await Promise.all([
    query,
    getCommentSummariesByConsultationId(),
    getParticipantSummariesByConsultationId(),
    getVoteSummariesByConsultationId(),
  ]);

  if (error) {
    throw error;
  }

  return (data ?? []).map((consultation) => {
    const commentSummary = commentSummariesByConsultationId.get(consultation.id);
    const participantSummary = participantSummariesByConsultationId.get(consultation.id);
    const voteSummary = voteSummariesByConsultationId.get(consultation.id);

    return {
      ...consultation,
      comment_count: commentSummary?.comment_count ?? 0,
      invited_expert_count: participantSummary?.invited_expert_count ?? 0,
      first_access_expert_count: participantSummary?.first_access_expert_count ?? 0,
      commenting_expert_count: commentSummary?.commenting_expert_count ?? 0,
      voting_expert_count: voteSummary?.voting_expert_count ?? 0,
      vote_count: voteSummary?.vote_count ?? 0,
      latest_comment_created_at: commentSummary?.latest_comment_created_at ?? null,
    };
  });
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

  if (!data) {
    return null;
  }

  return {
    ...data,
    comment_count: 0,
    invited_expert_count: 0,
    first_access_expert_count: 0,
    commenting_expert_count: 0,
    latest_comment_created_at: null,
  };
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
        "display_order",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<AdminConsultationCommentLookup[]>() as unknown as Promise<{
    data: AdminConsultationCommentLookup[] | null;
    error: AppError | null;
  }>;
  const [
    { data, error },
    voteStatsByCommentId,
    phase2ReviewStatusByCommentId,
    voteNotesByCommentId,
  ] = await Promise.all([
    query,
    getCommentVoteStatsByConsultationId(consultationId),
    getCommentPhase2ReviewStatusByConsultationId(consultationId),
    getCommentVoteNotesByConsultationId(consultationId),
  ]);

  let comments = data ?? [];
  let commentsError = error;

  if (isMissingColumnError(error, "expert_section_comments", "display_order")) {
    const fallbackQuery = supabase
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
      .returns<AdminConsultationCommentFallbackLookup[]>() as unknown as Promise<{
      data: AdminConsultationCommentFallbackLookup[] | null;
      error: AppError | null;
    }>;
    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    comments = (fallbackData ?? []).map((comment) => ({
      ...comment,
      display_order: null,
    }));
    commentsError = fallbackError;
  }

  if (commentsError) {
    throw commentsError;
  }

  return mapCommentsWithVoteStats(
    comments,
    voteStatsByCommentId,
    phase2ReviewStatusByCommentId,
    voteNotesByCommentId,
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
        "display_order",
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

  let comments = data ?? [];
  let commentsError = error;

  if (isMissingColumnError(error, "expert_section_comments", "display_order")) {
    const fallbackQuery = supabase
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
      .returns<AdminConsultationCommentFallbackLookup[]>() as unknown as Promise<{
      data: AdminConsultationCommentFallbackLookup[] | null;
      error: AppError | null;
    }>;
    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    comments = (fallbackData ?? []).map((comment) => ({
      ...comment,
      display_order: null,
    }));
    commentsError = fallbackError;
  }

  if (commentsError) {
    throw commentsError;
  }

  return mapCommentsWithVoteStats(
    comments,
    voteStatsByCommentId,
    phase2ReviewStatusByCommentId,
  );
}
