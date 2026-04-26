import {
  formatConsultationStateLabel,
  type DocumentSectionEntry,
  type ConsultationDirectoryEntry,
  type ConsultationState,
} from "@/features/admin/consultations/shared";

export type ExpertAssignedConsultationEntry = ConsultationDirectoryEntry;
export type ExpertConsultationSectionEntry = DocumentSectionEntry;

export const expertCommentPriorityLevels = ["low", "medium", "high"] as const;

export type ExpertSectionCommentPriority = (typeof expertCommentPriorityLevels)[number];

export const expertPhase2VoteOptions = [
  { value: 0, label: "Non sono d'accordo" },
  { value: 1, label: "Parzialmente in disaccordo" },
  { value: 2, label: "Neutro" },
  { value: 3, label: "Parzialmente d'accordo" },
  { value: 4, label: "D'accordo" },
] as const;

export type ExpertPhase2VoteScore = (typeof expertPhase2VoteOptions)[number]["value"];

export type ExpertSectionCommentEntry = {
  id: string;
  consultation_id: string;
  section_id: string;
  expert_profile_id: string;
  title: string;
  body_text: string | null;
  priority: ExpertSectionCommentPriority;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ExpertPhase2VotableCommentEntry = {
  id: string;
  consultation_id: string;
  section_id: string;
  display_title: string;
  display_body: string;
  order_index: number | null;
  current_vote_score: ExpertPhase2VoteScore | null;
};

export type ExpertConsultationView =
  | "locked"
  | "phase_1"
  | "phase_2";

export function isExpertConsultationAccessible(state: ConsultationState) {
  return state !== "draft";
}

export function getExpertConsultationView(state: ConsultationState): ExpertConsultationView {
  switch (state) {
    case "draft":
      return "locked";
    case "phase_1_open":
    case "phase_1_closed":
    case "admin_review":
      return "phase_1";
    case "phase_2_open":
    case "phase_2_closed":
    case "completed":
      return "phase_2";
    default:
      return "locked";
  }
}

export function canExpertSubmitSectionComments(state: ConsultationState) {
  return state === "phase_1_open";
}

export function canExpertVotePhase2(state: ConsultationState) {
  return state === "phase_2_open";
}

export function formatExpertCommentPriorityLabel(
  priority: ExpertSectionCommentPriority,
) {
  switch (priority) {
    case "low":
      return "Bassa";
    case "medium":
      return "Media";
    case "high":
      return "Alta";
    default:
      return priority;
  }
}

export function formatExpertPhase2VoteLabel(score: ExpertPhase2VoteScore) {
  return (
    expertPhase2VoteOptions.find((option) => option.value === score)?.label
    ?? String(score)
  );
}

export function getExpertConsultationCardDescription(
  consultation: ExpertAssignedConsultationEntry,
) {
  const documentLabel = consultation.document_title || "Documento non ancora definito";

  if (consultation.current_state === "draft") {
    return `${documentLabel}. La consultazione e' stata assegnata ma non e' ancora aperta agli esperti.`;
  }

  return `${documentLabel}. Stato attuale: ${formatConsultationStateLabel(consultation.current_state)}.`;
}

export function getExpertConsultationPageContent(
  consultation: ExpertAssignedConsultationEntry,
) {
  const stateLabel = formatConsultationStateLabel(consultation.current_state);

  switch (getExpertConsultationView(consultation.current_state)) {
    case "phase_1":
      return {
        eyebrow: "Fase 1",
        title:
          consultation.current_state === "phase_1_open"
            ? "Area commenti expert"
            : consultation.current_state === "admin_review"
              ? "Consultazione in accorpamento commenti"
            : "Consultazione in fase commenti",
        body:
          consultation.current_state === "phase_1_open"
            ? "Leggi le sezioni del documento, naviga il contenuto HTML completo e inserisci commenti strutturati per ciascuna sezione."
            : consultation.current_state === "admin_review"
              ? "Gli amministratori stanno accorpando i commenti ricevuti. In questa fase puoi solo rileggere i tuoi commenti gia' inseriti, senza aggiungerne o modificarne di nuovi."
            : "La fase di inserimento e' chiusa, ma puoi continuare a consultare le sezioni e rileggere i commenti gia' inviati.",
        stateLabel,
      };
    case "phase_2":
      if (consultation.current_state === "completed") {
        return {
          eyebrow: "Consultazione conclusa",
          title: "Consultazione conclusa",
          body:
            "La consultazione e' conclusa. Puoi continuare a consultare i commenti pubblicati e i voti che hai espresso, senza modificarli.",
          stateLabel,
        };
      }

      return {
        eyebrow: "Fase 2",
        title:
          consultation.current_state === "phase_2_open"
            ? "Area votazione commenti"
            : "Votazione commenti conclusa",
        body:
          consultation.current_state === "phase_2_open"
            ? "Consulta i commenti consolidati pubblicati per ogni sezione ed esprimi una valutazione da 0 a 4 sul tuo livello di accordo."
            : "La votazione e' chiusa. Puoi continuare a consultare i commenti pubblicati e rileggere le valutazioni che hai gia' espresso.",
        stateLabel,
      };
    case "locked":
    default:
      return {
        eyebrow: "In preparazione",
        title: "Consultazione non ancora aperta",
        body:
          "La consultazione e' stata assegnata, ma non e' ancora disponibile per l'esperto.",
        stateLabel,
      };
  }
}
