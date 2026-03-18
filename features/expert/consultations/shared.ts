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

export type ExpertConsultationView =
  | "locked"
  | "phase_1"
  | "phase_2"
  | "completed";

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
      return "phase_2";
    case "completed":
      return "completed";
    default:
      return "locked";
  }
}

export function canExpertSubmitSectionComments(state: ConsultationState) {
  return state === "phase_1_open";
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
            : "Consultazione in fase commenti",
        body:
          consultation.current_state === "phase_1_open"
            ? "Leggi le sezioni del documento, naviga il contenuto HTML completo e inserisci commenti strutturati per ciascuna sezione."
            : "La fase di inserimento e' chiusa, ma puoi continuare a consultare le sezioni e rileggere i commenti gia' inviati.",
        stateLabel,
      };
    case "phase_2":
      return {
        eyebrow: "Fase 2",
        title:
          consultation.current_state === "phase_2_open"
            ? "Area votazione commenti"
            : "Votazione commenti conclusa",
        body:
          consultation.current_state === "phase_2_open"
            ? "Qui costruiremo la pagina in cui l'esperto votera' i commenti consolidati dagli amministratori."
            : "La votazione e' chiusa. Questa route restera' il punto di accesso alla vista della fase 2 e al riepilogo del voto espresso.",
        stateLabel,
      };
    case "completed":
      return {
        eyebrow: "Risultati",
        title: "Consultazione completata",
        body:
          "Qui costruiremo la pagina finale con risultati aggregati e riepilogo conclusivo della consultazione.",
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
