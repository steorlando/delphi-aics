"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createAdminConsultationCommentAction,
  deleteAdminConsultationCommentAction,
  notifyAdminCommentAuthorAction,
  toggleAdminConsultationCommentPhase2ReviewAction,
  updateAdminConsultationCommentAction,
  type AdminCommentNotificationContext,
  type CreateAdminConsultationCommentFormState,
  type SendAdminCommentNotificationFormState,
  type ToggleAdminConsultationCommentPhase2ReviewFormState,
  type UpdateAdminConsultationCommentFormState,
} from "@/features/admin/consultations/actions";
import { CollapsiblePanel } from "@/features/admin/consultations/collapsible-panel";
import type {
  AdminConsultationCommentEntry,
  ConsultationParticipantEntry,
  ConsultationState,
  DocumentSectionEntry,
} from "@/features/admin/consultations/shared";
import type { ExpertDirectoryEntry } from "@/features/admin/experts/queries";
import {
  formatExpertCommentPriorityLabel,
  type ExpertSectionCommentPriority,
} from "@/features/expert/consultations/shared";
import { getSanitizedDocumentHtml } from "@/lib/html/sanitize";

type AdminConsultationCommentsManagerProps = {
  comments: AdminConsultationCommentEntry[];
  consultationId: string;
  consultationState: ConsultationState;
  experts: ExpertDirectoryEntry[];
  participants: ConsultationParticipantEntry[];
  sections: DocumentSectionEntry[];
};

const initialState: UpdateAdminConsultationCommentFormState = {
  status: "idle",
  message: "",
  notificationContext: null,
};

const initialNotificationState: SendAdminCommentNotificationFormState = {
  status: "idle",
  message: "",
};

const initialCreateState: CreateAdminConsultationCommentFormState = {
  status: "idle",
  message: "",
};

const initialPhase2ReviewState: ToggleAdminConsultationCommentPhase2ReviewFormState = {
  status: "idle",
  message: "",
};

const voteAverageFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
});

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getExpertDisplayLabel(expert: ExpertDirectoryEntry | null) {
  if (!expert) {
    return "Esperto non disponibile";
  }

  const name = `${expert.first_name} ${expert.last_name}`.trim();

  return name || expert.email;
}

function getExpertCompactLabel(expert: ExpertDirectoryEntry | null) {
  if (!expert) {
    return "Esperto non disponibile - Istituzione non indicata";
  }

  return `${getExpertDisplayLabel(expert)} - ${expert.institution_name || "Istituzione non indicata"}`;
}

function formatVoteCountLabel(value: number) {
  return `${value} ${value === 1 ? "voto" : "voti"}`;
}

function formatVoteAverageLabel(value: number | null) {
  if (value === null) {
    return "-";
  }

  return voteAverageFormatter.format(value);
}

function getInitialSelectedSectionId(
  sections: DocumentSectionEntry[],
  comments: AdminConsultationCommentEntry[],
) {
  const sectionIdsWithComments = new Set(comments.map((comment) => comment.section_id));

  return sections.find((section) => sectionIdsWithComments.has(section.id))?.id
    ?? sections[0]?.id
    ?? "";
}

function AdminPhase2VoteNotes({
  notes,
}: {
  notes: NonNullable<AdminConsultationCommentEntry["phase_2_vote_notes"]>;
}) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="phase-2-note-list admin-phase-2-note-list">
      <span className="phase-2-note-list-title">
        Commenti alla votazione degli esperti
      </span>
      {notes.map((note, index) => (
        <article className="phase-2-note-item" key={note.id}>
          <span className="phase-2-note-item-label">
            Commento anonimo {index + 1}
          </span>
          <p>{note.body_text}</p>
        </article>
      ))}
    </div>
  );
}

function PaperPlaneIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="15"
      viewBox="0 0 24 24"
      width="15"
    >
      <path
        d="M21 3 10 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m21 3-7 18-4-7-7-4 18-7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m16 16 4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="m4 20 4.2-1 9.5-9.5a1.75 1.75 0 0 0 0-2.5l-.7-.7a1.75 1.75 0 0 0-2.5 0L5 15.8 4 20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="m13.5 7.5 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="M5 7h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M7 7l.7 11.1A1.75 1.75 0 0 0 9.44 19.75h5.12a1.75 1.75 0 0 0 1.74-1.65L17 7"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10 10.5v5M14 10.5v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function EditAdminCommentInlineForm({
  comment,
  consultationId,
  onActionCommitted,
  onCancel,
}: {
  comment: AdminConsultationCommentEntry;
  consultationId: string;
  onActionCommitted: (context: AdminCommentNotificationContext) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(comment.title);
  const [bodyText, setBodyText] = useState(comment.body_text ?? "");
  const [priority, setPriority] = useState<ExpertSectionCommentPriority>(comment.priority);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const deleteSubmitRef = useRef<HTMLButtonElement>(null);
  const [state, formAction, isPending] = useActionState(
    updateAdminConsultationCommentAction,
    initialState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteAdminConsultationCommentAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.notificationContext) {
      onActionCommitted(state.notificationContext);
    }
  }, [onActionCommitted, state.notificationContext, state.status]);

  useEffect(() => {
    if (deleteState.status === "success" && deleteState.notificationContext) {
      onActionCommitted(deleteState.notificationContext);
    }
  }, [deleteState.notificationContext, deleteState.status, onActionCommitted]);

  return (
    <form action={formAction} className="auth-form expert-review-inline-edit-form">
      <input name="commentId" type="hidden" value={comment.id} />
      <input name="consultationId" type="hidden" value={consultationId} />
      <input name="sectionId" type="hidden" value={comment.section_id} />
      <input name="priority" type="hidden" value={priority} />

      {state.status === "error" && state.message ? (
        <p className="form-error expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <p className="form-error expert-review-inline-feedback">{deleteState.message}</p>
      ) : null}

      <label className="field">
        <span>Titolo commento</span>
        <input
          disabled={isPending || isDeleting}
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          required
          type="text"
          value={title}
        />
      </label>

      <label className="field">
        <span>Descrizione</span>
        <textarea
          disabled={isPending || isDeleting}
          name="bodyText"
          onChange={(event) => setBodyText(event.target.value)}
          value={bodyText}
        />
      </label>

      <fieldset className="field priority-segmented-field">
        <legend>Priorita&apos;</legend>
        <div className="priority-segmented-control" role="radiogroup">
          {[
            { value: "low", label: "Bassa" },
            { value: "medium", label: "Media" },
            { value: "high", label: "Alta" },
          ].map((option) => (
            <button
              aria-checked={priority === option.value}
              className={`priority-segmented-option${priority === option.value ? " priority-segmented-option-selected" : ""}`}
              disabled={isPending || isDeleting}
              key={option.value}
              onClick={() => setPriority(option.value as ExpertSectionCommentPriority)}
              role="radio"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="compact-form-actions expert-review-form-actions">
        <button
          className="secondary-button small-button"
          disabled={isPending || isDeleting}
          onClick={onCancel}
          type="button"
        >
          Annulla
        </button>

        <button
          aria-label={isDeleting ? "Eliminazione commento in corso" : "Elimina commento"}
          className="secondary-button small-button icon-action-button destructive-button"
          disabled={isPending || isDeleting}
          onClick={() => setIsDeleteConfirmationOpen(true)}
          type="button"
        >
          <TrashIcon />
          <span className="sr-only">Elimina commento</span>
        </button>

        <button
          aria-label={isPending ? "Aggiornamento commento in corso" : "Aggiorna commento"}
          className="primary-button small-button icon-action-button expert-review-submit-button"
          disabled={isPending || isDeleting}
          type="submit"
        >
          <PaperPlaneIcon />
          <span className="sr-only">Aggiorna commento</span>
        </button>

        <button
          className="sr-only"
          disabled={isPending || isDeleting}
          formAction={deleteAction}
          ref={deleteSubmitRef}
          type="submit"
        >
          Conferma eliminazione commento
        </button>
      </div>

      {isDeleteConfirmationOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop modal-backdrop-top"
          onClick={() => setIsDeleteConfirmationOpen(false)}
          role="dialog"
        >
          <div
            className="modal-card admin-comment-notification-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card-header">
              <div>
                <span className="eyebrow">Conferma eliminazione</span>
                <h3>Vuoi davvero eliminare questo commento?</h3>
              </div>
              <button
                aria-label="Chiudi conferma eliminazione"
                className="secondary-button small-button"
                disabled={isPending || isDeleting}
                onClick={() => setIsDeleteConfirmationOpen(false)}
                type="button"
              >
                Chiudi
              </button>
            </div>

            <p className="muted">
              Il commento non verra&apos; rimosso dal database, ma sara&apos;
              segnato come inattivo e non sara&apos; piu&apos; visibile
              all&apos;esperto nelle fasi successive.
            </p>

            <div className="compact-form-actions modal-form-actions">
              <button
                className="secondary-button"
                disabled={isPending || isDeleting}
                onClick={() => setIsDeleteConfirmationOpen(false)}
                type="button"
              >
                Annulla
              </button>
              <button
                className="primary-button destructive-button"
                disabled={isPending || isDeleting}
                onClick={() => {
                  setIsDeleteConfirmationOpen(false);
                  deleteSubmitRef.current?.click();
                }}
                type="button"
              >
                Conferma eliminazione
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function AdminCommentNotificationModal({
  context,
  onClose,
}: {
  context: AdminCommentNotificationContext;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"choice" | "message">("choice");
  const [message, setMessage] = useState("");
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    notifyAdminCommentAuthorAction,
    initialNotificationState,
  );

  const actionVerb =
    context.actionType === "deleted" ? "eliminato" : "modificato";

  return (
    <div
      aria-modal="true"
      className="modal-backdrop modal-backdrop-top"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-card admin-comment-notification-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card-header">
          <div>
            <span className="eyebrow">Notifica autore</span>
            <h3>
              {state.status === "success"
                ? "Notifica inviata"
                : `Il commento e' gia' stato ${actionVerb}. Vuoi notificare l'autore?`}
            </h3>
          </div>
          <button
            aria-label="Chiudi notifica autore"
            className="secondary-button small-button"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Chiudi
          </button>
        </div>

        {state.status === "success" ? (
          <>
            <p className="form-success">{state.message}</p>
            <div className="compact-form-actions modal-form-actions">
              <button
                className="primary-button"
                onClick={onClose}
                type="button"
              >
                Chiudi
              </button>
            </div>
          </>
        ) : step === "choice" ? (
          <>
            <p className="muted">
              La modifica e&apos; gia&apos; stata registrata nel database. Da qui
              puoi solo scegliere se inviare o meno una spiegazione
              all&apos;autore del commento.
            </p>

            <div className="compact-form-actions modal-form-actions">
              <button
                className="secondary-button"
                disabled={isPending}
                onClick={onClose}
                type="button"
              >
                No, chiudi
              </button>
              <button
                className="primary-button"
                disabled={isPending}
                onClick={() => {
                  setStep("message");
                  setLocalErrorMessage(null);
                }}
                type="button"
              >
                Si&apos;, scrivi messaggio
              </button>
            </div>
          </>
        ) : (
          <form action={formAction} className="auth-form">
            <input name="actionType" type="hidden" value={context.actionType} />
            <input name="commentId" type="hidden" value={context.commentId} />
            <input
              name="consultationId"
              type="hidden"
              value={context.consultationId}
            />
            <input
              name="previousTitle"
              type="hidden"
              value={context.previousComment.title}
            />
            <input
              name="previousBodyText"
              type="hidden"
              value={context.previousComment.bodyText ?? ""}
            />
            <input
              name="nextTitle"
              type="hidden"
              value={context.nextComment?.title ?? ""}
            />
            <input
              name="nextBodyText"
              type="hidden"
              value={context.nextComment?.bodyText ?? ""}
            />
            <input name="sectionId" type="hidden" value={context.sectionId} />

            {state.status === "error" && state.message ? (
              <p className="form-error">{state.message}</p>
            ) : null}

            {localErrorMessage ? (
              <p className="form-error">{localErrorMessage}</p>
            ) : null}

            <label className="field">
              <span>Messaggio da inviare all&apos;autore</span>
              <textarea
                className="admin-comment-notification-textarea"
                disabled={isPending}
                name="notificationMessage"
                onChange={(event) => {
                  setMessage(event.target.value);
                  if (localErrorMessage) {
                    setLocalErrorMessage(null);
                  }
                }}
                placeholder={
                  context.actionType === "deleted"
                    ? "Spiega perche' il commento e' stato eliminato, ad esempio perche' accorpato ad altri commenti simili."
                    : "Spiega perche' il commento e' stato modificato o come e' stato riformulato."
                }
                required
                value={message}
              />
            </label>

            <div className="compact-form-actions modal-form-actions">
              <button
                className="secondary-button"
                disabled={isPending}
                onClick={() => {
                  setStep("choice");
                  setLocalErrorMessage(null);
                }}
                type="button"
              >
                Indietro
              </button>
              <button
                className="primary-button"
                disabled={isPending}
                onClick={(event) => {
                  if (!message.trim()) {
                    event.preventDefault();
                    setLocalErrorMessage(
                      "Scrivi un messaggio prima di inviare la notifica all'autore.",
                    );
                  }
                }}
                type="submit"
              >
                Invia notifica
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminPhase2ReviewToggle({
  commentId,
  consultationId,
  isChecked,
  onCommittedChange,
  onOptimisticChange,
}: {
  commentId: string;
  consultationId: string;
  isChecked: boolean;
  onCommittedChange: (nextValue: boolean) => void;
  onOptimisticChange: (nextValue: boolean) => void;
}) {
  const router = useRouter();
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(isChecked);
  const [state, formAction, isPending] = useActionState(
    toggleAdminConsultationCommentPhase2ReviewAction,
    initialPhase2ReviewState,
  );

  useEffect(() => {
    setChecked(isChecked);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = String(isChecked);
    }
  }, [isChecked]);

  useEffect(() => {
    if (state.status === "success") {
      onCommittedChange(checked);
      router.refresh();
    }
  }, [checked, onCommittedChange, router, state.status]);

  useEffect(() => {
    if (state.status === "error") {
      setChecked(isChecked);
      onOptimisticChange(isChecked);
    }
  }, [isChecked, onOptimisticChange, state.status]);

  return (
    <form action={formAction} className="admin-consultation-phase-2-review-form">
      <input name="commentId" type="hidden" value={commentId} />
      <input name="consultationId" type="hidden" value={consultationId} />
      <input
        defaultValue={String(checked)}
        name="isPhase2Reviewed"
        ref={hiddenInputRef}
        type="hidden"
      />

      <label
        className={`admin-consultation-phase-2-review-toggle${checked ? " admin-consultation-phase-2-review-toggle-checked" : ""}`}
      >
        <input
          checked={checked}
          disabled={isPending}
          name="phase2ReviewedToggle"
          onChange={(event) => {
            const nextValue = event.target.checked;
            setChecked(nextValue);
            onOptimisticChange(nextValue);
            if (hiddenInputRef.current) {
              hiddenInputRef.current.value = String(nextValue);
            }
            event.currentTarget.form?.requestSubmit();
          }}
          type="checkbox"
        />
        <span>Gia&apos; integrato nel documento rivisto</span>
      </label>

      {state.status === "error" && state.message ? (
        <p className="form-error admin-consultation-phase-2-review-feedback">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function CreateAdminCommentForm({
  assignedExperts,
  consultationId,
  section,
}: {
  assignedExperts: ExpertDirectoryEntry[];
  consultationId: string;
  section: DocumentSectionEntry;
}) {
  const router = useRouter();
  const [expertProfileId, setExpertProfileId] = useState(assignedExperts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [priority, setPriority] = useState<ExpertSectionCommentPriority>("medium");
  const [state, formAction, isPending] = useActionState(
    createAdminConsultationCommentAction,
    initialCreateState,
  );
  const canCreate = assignedExperts.length > 0;

  useEffect(() => {
    setExpertProfileId((current) =>
      assignedExperts.some((expert) => expert.id === current)
        ? current
        : assignedExperts[0]?.id ?? "",
    );
  }, [assignedExperts]);

  useEffect(() => {
    if (state.status === "success") {
      setTitle("");
      setBodyText("");
      setPriority("medium");
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="auth-form admin-comment-create-form">
      <input name="consultationId" type="hidden" value={consultationId} />
      <input name="sectionId" type="hidden" value={section.id} />
      <input name="priority" type="hidden" value={priority} />

      <div className="section-heading admin-comment-create-heading">
        <span className="eyebrow">Nuovo commento</span>
        <div className="section-heading-copy">
          <h2>Aggiungi commento</h2>
        </div>
      </div>

      {!canCreate ? (
        <p className="form-error expert-review-inline-feedback">
          Assegna almeno un esperto attivo alla consultazione prima di creare commenti.
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="form-error expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="form-success expert-review-inline-feedback">{state.message}</p>
      ) : null}

      <label className="field">
        <span>Autore di riferimento</span>
        <select
          disabled={!canCreate || isPending}
          name="expertProfileId"
          onChange={(event) => setExpertProfileId(event.target.value)}
          required
          value={expertProfileId}
        >
          {assignedExperts.map((expert) => (
            <option key={expert.id} value={expert.id}>
              {getExpertCompactLabel(expert)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Titolo commento</span>
        <input
          disabled={!canCreate || isPending}
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          required
          type="text"
          value={title}
        />
      </label>

      <label className="field">
        <span>Descrizione</span>
        <textarea
          disabled={!canCreate || isPending}
          name="bodyText"
          onChange={(event) => setBodyText(event.target.value)}
          value={bodyText}
        />
      </label>

      <fieldset className="field priority-segmented-field">
        <legend>Priorita&apos;</legend>
        <div className="priority-segmented-control" role="radiogroup">
          {[
            { value: "low", label: "Bassa" },
            { value: "medium", label: "Media" },
            { value: "high", label: "Alta" },
          ].map((option) => (
            <button
              aria-checked={priority === option.value}
              className={`priority-segmented-option${priority === option.value ? " priority-segmented-option-selected" : ""}`}
              disabled={!canCreate || isPending}
              key={option.value}
              onClick={() => setPriority(option.value as ExpertSectionCommentPriority)}
              role="radio"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="compact-form-actions expert-review-form-actions">
        <button
          aria-label={isPending ? "Creazione commento in corso" : "Crea commento"}
          className="primary-button small-button icon-action-button expert-review-submit-button"
          disabled={!canCreate || isPending}
          type="submit"
        >
          <PaperPlaneIcon />
          <span className="sr-only">Crea commento</span>
        </button>
      </div>
    </form>
  );
}

export function AdminConsultationCommentsManager({
  comments,
  consultationId,
  consultationState,
  experts,
  participants,
  sections,
}: AdminConsultationCommentsManagerProps) {
  const router = useRouter();
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [pendingNotificationContext, setPendingNotificationContext] =
    useState<AdminCommentNotificationContext | null>(null);
  const [phase2ReviewOverrides, setPhase2ReviewOverrides] = useState<Record<string, boolean>>({});
  const [selectedSectionId, setSelectedSectionId] = useState(() =>
    getInitialSelectedSectionId(sections, comments),
  );
  const commentsBySection = useMemo(
    () =>
      comments.reduce<Map<string, AdminConsultationCommentEntry[]>>((map, comment) => {
        const sectionComments = map.get(comment.section_id) ?? [];
        sectionComments.push(comment);
        map.set(comment.section_id, sectionComments);
        return map;
      }, new Map<string, AdminConsultationCommentEntry[]>()),
    [comments],
  );
  const expertsById = useMemo(
    () => new Map(experts.map((expert) => [expert.id, expert])),
    [experts],
  );
  const activeAssignedExpertIds = useMemo(
    () =>
      new Set(
        participants
          .filter((participant) => participant.is_active)
          .map((participant) => participant.profile_id),
      ),
    [participants],
  );
  const assignedExperts = useMemo(
    () =>
      experts.filter(
        (expert) => expert.is_active && activeAssignedExpertIds.has(expert.id),
      ),
    [activeAssignedExpertIds, experts],
  );
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const selectedSectionComments = selectedSection
    ? commentsBySection.get(selectedSection.id) ?? []
    : [];
  const canAdminCreateComments = consultationState === "admin_review";
  const isPhase2State = consultationState === "phase_2_open"
    || consultationState === "phase_2_closed"
    || consultationState === "completed";

  useEffect(() => {
    const nextSectionId = getInitialSelectedSectionId(sections, comments);

    if (!selectedSectionId && nextSectionId) {
      setSelectedSectionId(nextSectionId);
      return;
    }

    if (selectedSectionId && !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(nextSectionId);
    }
  }, [comments, sections, selectedSectionId]);

  useEffect(() => {
    setExpandedCommentId(null);
    setEditingCommentId(null);
  }, [selectedSectionId]);

  useEffect(() => {
    setPhase2ReviewOverrides({});
  }, [comments]);

  function handleSectionSelect(sectionId: string) {
    setSelectedSectionId(sectionId);
    setIsNavCollapsed(true);
  }

  function handleCommentExpand(commentId: string) {
    setExpandedCommentId((current) => (current === commentId ? null : commentId));
  }

  function handleCommentEdit(commentId: string) {
    setEditingCommentId(commentId);
    setExpandedCommentId(commentId);
  }

  function handleCommentActionCommitted(
    notificationContext: AdminCommentNotificationContext,
  ) {
    setEditingCommentId(null);
    setExpandedCommentId(null);
    setPendingNotificationContext(notificationContext);
  }

  function closeNotificationModal() {
    setPendingNotificationContext(null);
    router.refresh();
  }

  function handlePhase2ReviewOptimisticChange(commentId: string, nextValue: boolean) {
    setPhase2ReviewOverrides((current) => ({
      ...current,
      [commentId]: nextValue,
    }));
  }

  function handlePhase2ReviewCommitted(commentId: string, nextValue: boolean) {
    if (nextValue) {
      setExpandedCommentId((current) => (current === commentId ? null : current));
      setEditingCommentId((current) => (current === commentId ? null : current));
    }
  }

  return (
    <CollapsiblePanel
      defaultOpen={comments.length > 0 || canAdminCreateComments}
      description={
        canAdminCreateComments
          ? "Gli amministratori possono creare, modificare ed eliminare commenti durante l'accorpamento."
          : comments.length === 0
          ? "Non ci sono ancora commenti attivi inseriti dagli esperti per questa consultazione."
          : `Sono presenti ${comments.length} ${comments.length === 1 ? "commento attivo" : "commenti attivi"} modificabili dagli amministratori.`
      }
      eyebrow="Commenti"
      headerActions={(
        <Link
          className="inline-link-button"
          href={`/admin/consultations/${consultationId}/deleted-comments`}
        >
          Commenti eliminati
        </Link>
      )}
      title="Rivedi i commenti"
    >
      {sections.length === 0 ? (
        <p className="muted">
          Non sono ancora disponibili sezioni del documento. Crea prima la
          struttura del testo per poter consultare i commenti associati.
        </p>
      ) : (
        <section
          className={`expert-review-layout admin-consultation-comments-layout${isNavCollapsed ? " expert-review-layout-nav-collapsed" : ""}`}
        >
          <aside
            className={`panel-card expert-review-nav-panel${isNavCollapsed ? " expert-review-nav-panel-collapsed" : ""}`}
          >
            <div className="expert-review-nav-header">
              <div className={`section-heading${isNavCollapsed ? " expert-review-nav-copy-collapsed" : ""}`}>
                <span className="eyebrow">Sezioni</span>
                <div className="section-heading-copy">
                  {!isNavCollapsed ? (
                    <>
                      <h2>Esplora le sezioni commentate</h2>
                      <p>
                        Seleziona una sezione per leggere il testo corrente e
                        gestire i commenti inseriti dagli esperti.
                      </p>
                    </>
                  ) : (
                    <h2 className="sr-only">Esplora le sezioni commentate</h2>
                  )}
                </div>
              </div>

              <button
                aria-expanded={!isNavCollapsed}
                aria-label={isNavCollapsed ? "Espandi elenco sezioni" : "Comprimi elenco sezioni"}
                className="secondary-button small-button expert-review-nav-toggle"
                onClick={() => setIsNavCollapsed((current) => !current)}
                type="button"
              >
                <span aria-hidden="true">{isNavCollapsed ? "→" : "←"}</span>
              </button>
            </div>

            <div
              aria-label="Elenco sezioni del documento"
              className="expert-review-section-list"
              role="tablist"
            >
              {sections.map((section) => {
                const isSelected = section.id === selectedSection?.id;
                const commentCount = commentsBySection.get(section.id)?.length ?? 0;

                return (
                  <button
                    aria-controls={`admin-section-panel-${section.id}`}
                    aria-selected={isSelected}
                    className={`expert-review-section-button${isSelected ? " expert-review-section-button-selected" : ""}${isNavCollapsed ? " expert-review-section-button-collapsed" : ""}`}
                    key={section.id}
                    onClick={() => handleSectionSelect(section.id)}
                    role="tab"
                    title={section.title}
                    type="button"
                  >
                    <div className="expert-review-section-button-main">
                      <span className="section-index-order">#{section.order_index}</span>
                      {!isNavCollapsed ? (
                        <div className="expert-review-section-button-copy">
                          <strong>{section.title}</strong>
                          <span>
                            {section.reference_label || "Senza riferimento"} · {section.slug}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {!isNavCollapsed ? (
                      <span className="expert-review-comment-count">
                        {commentCount} {commentCount === 1 ? "commento" : "commenti"}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <article
            className="panel-card panel-card-wide expert-review-document-panel"
            id={selectedSection ? `admin-section-panel-${selectedSection.id}` : undefined}
            role="tabpanel"
          >
            {selectedSection ? (
              <>
                <div className="section-heading">
                  <span className="eyebrow">Contenuto sezione</span>
                  <div className="section-heading-copy">
                    <h2>{selectedSection.title}</h2>
                    <p>
                      {selectedSection.reference_label || "Riferimento non indicato"}
                      {" "}· Slug: <strong>{selectedSection.slug}</strong>
                    </p>
                  </div>
                </div>

                <div className="expert-review-document-shell">
                  <div
                    className="document-rendered-content expert-review-document-content"
                    dangerouslySetInnerHTML={{
                      __html: getSanitizedDocumentHtml(selectedSection.body_text),
                    }}
                  />
                </div>
              </>
            ) : null}
          </article>

          <div className="expert-review-side-column admin-consultation-comments-side-column">
            <section className="panel-card expert-review-comments-history admin-consultation-comments-history">
              {canAdminCreateComments && selectedSection ? (
                <CreateAdminCommentForm
                  assignedExperts={assignedExperts}
                  consultationId={consultationId}
                  section={selectedSection}
                />
              ) : null}

              {selectedSectionComments.length > 0 ? (
                <div className="expert-review-comment-list expert-review-comment-list-compact admin-consultation-comment-list">
                  {selectedSectionComments.map((comment) => {
                    const isExpanded = expandedCommentId === comment.id;
                    const isEditing = editingCommentId === comment.id;
                    const author = expertsById.get(comment.expert_profile_id) ?? null;
                    const compactAuthorLabel = getExpertCompactLabel(author);
                    const isPhase2Reviewed = Object.prototype.hasOwnProperty.call(
                      phase2ReviewOverrides,
                      comment.id,
                    )
                      ? phase2ReviewOverrides[comment.id]
                      : comment.is_phase_2_reviewed;

                    return (
                      <article
                        className={`expert-review-comment-card expert-review-comment-card-compact${isExpanded ? " expert-review-comment-card-expanded" : ""}${isEditing ? " expert-review-comment-card-editing" : ""}${isPhase2State && isPhase2Reviewed ? " admin-consultation-comment-card-reviewed" : ""}`}
                        key={comment.id}
                      >
                        <div className="expert-review-comment-row">
                          <div className="admin-consultation-comment-row-copy">
                            <div className="expert-review-comment-row-main">
                              <strong className="expert-review-comment-row-title">
                                {comment.title}
                              </strong>
                              {isPhase2State ? (
                                <div className="admin-consultation-vote-summary">
                                  <span className="expert-review-priority-badge admin-consultation-vote-badge">
                                    {formatVoteCountLabel(comment.vote_count)}
                                  </span>
                                  <span className="expert-review-priority-badge admin-consultation-vote-badge">
                                    Media: {formatVoteAverageLabel(comment.average_vote_score)}
                                  </span>
                                </div>
                              ) : (
                                <span className="expert-review-priority-badge">
                                  {formatExpertCommentPriorityLabel(comment.priority)}
                                </span>
                              )}
                            </div>
                            <span className="admin-consultation-comment-author">
                              {compactAuthorLabel}
                            </span>
                          </div>

                          <div className="expert-review-comment-actions">
                            <button
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded
                                  ? "Chiudi dettaglio commento"
                                  : "Apri dettaglio commento"
                              }
                              className="secondary-button small-button icon-action-button"
                              onClick={() => handleCommentExpand(comment.id)}
                              type="button"
                            >
                              <SearchIcon />
                              <span className="sr-only">
                                {isExpanded ? "Chiudi dettaglio commento" : "Apri dettaglio commento"}
                              </span>
                            </button>

                            <button
                              aria-label="Modifica commento"
                              className="secondary-button small-button icon-action-button"
                              onClick={() => handleCommentEdit(comment.id)}
                              type="button"
                            >
                              <PencilIcon />
                              <span className="sr-only">Modifica commento</span>
                            </button>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="expert-review-comment-details">
                            {isEditing ? (
                              <EditAdminCommentInlineForm
                                comment={comment}
                                consultationId={consultationId}
                                onActionCommitted={handleCommentActionCommitted}
                                onCancel={() => setEditingCommentId(null)}
                              />
                            ) : (
                              <>
                                <span className="expert-review-comment-date">
                                  Inserito il {formatCommentDate(comment.created_at)}
                                  {comment.updated_at !== comment.created_at
                                    ? ` · Aggiornato il ${formatCommentDate(comment.updated_at)}`
                                    : ""}
                                </span>
                                {comment.body_text ? (
                                  <p className="expert-review-comment-body">{comment.body_text}</p>
                                ) : (
                                  <p className="muted expert-review-comment-body">
                                    Nessuna descrizione aggiuntiva.
                                  </p>
                                )}
                                <AdminPhase2VoteNotes
                                  notes={comment.phase_2_vote_notes ?? []}
                                />
                              </>
                            )}
                          </div>
                        ) : null}

                        {isPhase2State ? (
                          <div className="admin-consultation-comment-footer">
                            <AdminPhase2ReviewToggle
                              commentId={comment.id}
                              consultationId={consultationId}
                              isChecked={isPhase2Reviewed}
                              onCommittedChange={(nextValue) =>
                                handlePhase2ReviewCommitted(comment.id, nextValue)
                              }
                              onOptimisticChange={(nextValue) =>
                                handlePhase2ReviewOptimisticChange(comment.id, nextValue)
                              }
                            />
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="muted admin-consultation-comments-empty">
                  Questa sezione non ha ancora commenti attivi da revisionare.
                </p>
              )}
            </section>
          </div>
        </section>
      )}

      {pendingNotificationContext ? (
        <AdminCommentNotificationModal
          context={pendingNotificationContext}
          onClose={closeNotificationModal}
        />
      ) : null}
    </CollapsiblePanel>
  );
}
