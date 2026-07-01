import type { ExpertSectionCommentPriority } from "@/features/expert/consultations/shared";

export const consultationStates = [
  "draft",
  "phase_1_open",
  "phase_1_closed",
  "admin_review",
  "phase_2_open",
  "phase_2_closed",
  "completed",
] as const;

export type ConsultationState = (typeof consultationStates)[number];

export const consultationStateLabels: Record<ConsultationState, string> = {
  draft: "In preparazione",
  phase_1_open: "Commenti",
  phase_1_closed: "Commenti chiusi",
  admin_review: "Accorpamento commenti",
  phase_2_open: "Votazione commenti",
  phase_2_closed: "Votazione chiusa",
  completed: "Consultazione conclusa",
};

export const primaryConsultationStates = [
  "draft",
  "phase_1_open",
  "admin_review",
  "phase_2_open",
  "completed",
] as const;

export function getConsultationStateSelectOptions(currentState: ConsultationState) {
  const primaryStateSet = new Set<ConsultationState>(primaryConsultationStates);
  const options = primaryConsultationStates.map((state) => ({
    value: state,
    label: consultationStateLabels[state],
  }));

  if (primaryStateSet.has(currentState)) {
    return options;
  }

  return [
    {
      value: currentState,
      label: `${consultationStateLabels[currentState]} (stato avanzato attuale)`,
    },
    ...options,
  ];
}

export type ConsultationDirectoryEntry = {
  id: string;
  title: string;
  description: string | null;
  current_state: ConsultationState;
  phase_1_opens_at: string | null;
  phase_1_closes_at: string | null;
  phase_2_opens_at: string | null;
  phase_2_closes_at: string | null;
  document_title: string | null;
  document_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  comment_count: number;
  invited_expert_count: number;
  first_access_expert_count: number;
  commenting_expert_count: number;
  voting_expert_count: number;
  vote_count: number;
  latest_comment_created_at: string | null;
};

export type DocumentSectionEntry = {
  id: string;
  consultation_id: string;
  title: string;
  slug: string;
  order_index: number;
  body_text: string | null;
  reference_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConsultationParticipantEntry = {
  id: string;
  consultation_id: string;
  profile_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminConsultationCommentEntry = {
  id: string;
  consultation_id: string;
  section_id: string;
  expert_profile_id: string;
  title: string;
  body_text: string | null;
  priority: ExpertSectionCommentPriority;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
  is_phase_2_reviewed: boolean;
  vote_count: number;
  average_vote_score: number | null;
  phase_2_vote_notes?: AdminPhase2VoteNoteEntry[];
};

export type AdminPhase2VoteNoteEntry = {
  id: string;
  comment_id: string;
  author_profile_id: string;
  body_text: string;
  created_at: string;
  updated_at: string;
};

export function formatConsultationStateLabel(state: ConsultationState) {
  return consultationStateLabels[state] ?? state;
}

export function slugifySectionTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
