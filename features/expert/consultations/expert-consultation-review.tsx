"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createExpertSectionCommentAction,
  deleteExpertSectionCommentAction,
  updateExpertSectionCommentAction,
  type CreateExpertSectionCommentFormState,
} from "@/features/expert/consultations/actions";
import {
  formatExpertCommentPriorityLabel,
  type ExpertSectionCommentPriority,
  type ExpertConsultationSectionEntry,
  type ExpertSectionCommentEntry,
} from "@/features/expert/consultations/shared";
import { getSanitizedDocumentHtml } from "@/lib/html/sanitize";

type ExpertConsultationReviewProps = {
  canSubmitComments: boolean;
  comments: ExpertSectionCommentEntry[];
  consultationId: string;
  sections: ExpertConsultationSectionEntry[];
};

type SectionCommentComposerProps = {
  canSubmitComments: boolean;
  consultationId: string;
  section: ExpertConsultationSectionEntry;
};

const initialCommentState: CreateExpertSectionCommentFormState = {
  status: "idle",
  message: "",
};

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function SectionCommentComposer({
  canSubmitComments,
  consultationId,
  section,
}: SectionCommentComposerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [priority, setPriority] = useState<ExpertSectionCommentPriority>("medium");
  const [state, formAction, isPending] = useActionState(
    createExpertSectionCommentAction,
    initialCommentState,
  );

  useEffect(() => {
    if (state.status === "success") {
      setTitle("");
      setBodyText("");
      setPriority("medium");
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <div className="expert-review-composer">
      {!canSubmitComments ? (
        <p className="form-error expert-review-inline-feedback">
          L&apos;inserimento di nuovi commenti non e&apos; disponibile in questa fase.
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="form-error expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="form-success expert-review-inline-feedback">{state.message}</p>
      ) : null}

      <form action={formAction} className="auth-form">
        <input name="consultationId" type="hidden" value={consultationId} />
        <input name="sectionId" type="hidden" value={section.id} />
        <input name="priority" type="hidden" value={priority} />

        <label className="field">
          <span>Titolo commento</span>
          <input
            disabled={!canSubmitComments || isPending}
            name="title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Osservazione principale"
            required
            type="text"
            value={title}
          />
        </label>

        <label className="field">
          <span>Descrizione</span>
          <textarea
            disabled={!canSubmitComments || isPending}
            name="bodyText"
            onChange={(event) => setBodyText(event.target.value)}
            placeholder="Descrivi il contesto, la criticita' o la proposta di modifica."
            value={bodyText}
          />
        </label>

        <div className="expert-review-priority-row">
          <fieldset className="field priority-segmented-field expert-review-priority-field">
            <legend>Priorita&apos;</legend>
            <div
              aria-label="Priorita'"
              className="priority-segmented-control"
              role="radiogroup"
            >
              {[
                { value: "low", label: "Bassa" },
                { value: "medium", label: "Media" },
                { value: "high", label: "Alta" },
              ].map((option) => (
                <button
                  aria-checked={priority === option.value}
                  className={`priority-segmented-option${priority === option.value ? " priority-segmented-option-selected" : ""}`}
                  disabled={!canSubmitComments || isPending}
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
              aria-label={
                isPending
                  ? "Invio commento in corso"
                  : "Salva commento"
              }
              className="primary-button small-button icon-action-button expert-review-submit-button"
              disabled={!canSubmitComments || isPending}
              type="submit"
            >
              <PaperPlaneIcon />
              <span className="sr-only">
                Salva commento
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function EditCommentInlineForm({
  canSubmitComments,
  comment,
  consultationId,
  onCancel,
}: {
  canSubmitComments: boolean;
  comment: ExpertSectionCommentEntry;
  consultationId: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(comment.title);
  const [bodyText, setBodyText] = useState(comment.body_text ?? "");
  const [priority, setPriority] = useState<ExpertSectionCommentPriority>(comment.priority);
  const [state, formAction, isPending] = useActionState(
    updateExpertSectionCommentAction,
    initialCommentState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteExpertSectionCommentAction,
    initialCommentState,
  );

  useEffect(() => {
    if (state.status === "success") {
      onCancel();
      router.refresh();
    }
  }, [onCancel, router, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      onCancel();
      router.refresh();
    }
  }, [deleteState.status, onCancel, router]);

  return (
    <form action={formAction} className="auth-form expert-review-inline-edit-form">
      <input name="commentId" type="hidden" value={comment.id} />
      <input name="consultationId" type="hidden" value={consultationId} />
      <input name="sectionId" type="hidden" value={comment.section_id} />
      <input name="priority" type="hidden" value={priority} />

      {state.status === "error" && state.message ? (
        <p className="form-error expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="form-success expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <p className="form-error expert-review-inline-feedback">{deleteState.message}</p>
      ) : null}

      {deleteState.status === "success" && deleteState.message ? (
        <p className="form-success expert-review-inline-feedback">{deleteState.message}</p>
      ) : null}

      <label className="field">
        <span>Titolo commento</span>
        <input
          disabled={!canSubmitComments || isPending}
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
          disabled={!canSubmitComments || isPending}
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
              disabled={!canSubmitComments || isPending}
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
          disabled={!canSubmitComments || isPending || isDeleting}
          formAction={deleteAction}
          type="submit"
        >
          <TrashIcon />
          <span className="sr-only">Elimina commento</span>
        </button>

        <button
          aria-label={isPending ? "Aggiornamento commento in corso" : "Aggiorna commento"}
          className="primary-button small-button icon-action-button expert-review-submit-button"
          disabled={!canSubmitComments || isPending || isDeleting}
          type="submit"
        >
          <PaperPlaneIcon />
          <span className="sr-only">Aggiorna commento</span>
        </button>
      </div>
    </form>
  );
}

export function ExpertConsultationReview({
  canSubmitComments,
  comments,
  consultationId,
  sections,
}: ExpertConsultationReviewProps) {
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id ?? "");
  const commentsBySection = useMemo(
    () =>
      comments.reduce<Map<string, ExpertSectionCommentEntry[]>>((map, comment) => {
        const sectionComments = map.get(comment.section_id) ?? [];
        sectionComments.push(comment);
        map.set(comment.section_id, sectionComments);
        return map;
      }, new Map<string, ExpertSectionCommentEntry[]>()),
    [comments],
  );
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const selectedSectionComments = selectedSection
    ? commentsBySection.get(selectedSection.id) ?? []
    : [];

  useEffect(() => {
    if (!selectedSectionId && sections[0]) {
      setSelectedSectionId(sections[0].id);
      return;
    }

    if (selectedSectionId && !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(sections[0]?.id ?? "");
    }
  }, [sections, selectedSectionId]);

  useEffect(() => {
    setExpandedCommentId(null);
    setEditingCommentId(null);
  }, [selectedSectionId]);

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

  if (sections.length === 0) {
    return (
      <section className="panel-card panel-card-wide">
        <div className="section-heading">
          <span className="eyebrow">Documento</span>
          <div className="section-heading-copy">
            <h2>Sezioni non ancora disponibili</h2>
            <p>
              L&apos;amministrazione non ha ancora pubblicato le sezioni del documento
              per questa consultazione.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`expert-review-layout${isNavCollapsed ? " expert-review-layout-nav-collapsed" : ""}`}
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
                  <h2>Naviga il documento</h2>
                  <p>
                    Seleziona una sezione per leggerne il contenuto completo e vedere i
                    commenti che hai gia&apos; associato.
                  </p>
                </>
              ) : (
                <h2 className="sr-only">Naviga il documento</h2>
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
                aria-controls={`section-panel-${section.id}`}
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
        id={selectedSection ? `section-panel-${selectedSection.id}` : undefined}
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

      <div className="expert-review-side-column">
        {selectedSectionComments.length > 0 ? (
          <section className="panel-card expert-review-comments-history">
            <div className="expert-review-comment-list expert-review-comment-list-compact">
              {selectedSectionComments.map((comment) => {
                const isExpanded = expandedCommentId === comment.id;
                const isEditing = editingCommentId === comment.id;

                return (
                  <article
                    className={`expert-review-comment-card expert-review-comment-card-compact${isExpanded ? " expert-review-comment-card-expanded" : ""}${isEditing ? " expert-review-comment-card-editing" : ""}`}
                    key={comment.id}
                  >
                    <div className="expert-review-comment-row">
                      <div className="expert-review-comment-row-main">
                        <strong className="expert-review-comment-row-title">
                          {comment.title}
                        </strong>
                        <span className="expert-review-priority-badge">
                          {formatExpertCommentPriorityLabel(comment.priority)}
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

                        {canSubmitComments ? (
                          <button
                            aria-label="Modifica commento"
                            className="secondary-button small-button icon-action-button"
                            onClick={() => handleCommentEdit(comment.id)}
                            type="button"
                          >
                            <PencilIcon />
                            <span className="sr-only">Modifica commento</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="expert-review-comment-details">
                        {isEditing ? (
                          <EditCommentInlineForm
                            canSubmitComments={canSubmitComments}
                            comment={comment}
                            consultationId={consultationId}
                            onCancel={() => setEditingCommentId(null)}
                          />
                        ) : (
                          <>
                            <span className="expert-review-comment-date">
                              {formatCommentDate(comment.created_at)}
                            </span>
                            {comment.body_text ? (
                              <p className="expert-review-comment-body">{comment.body_text}</p>
                            ) : (
                              <p className="muted expert-review-comment-body">
                                Nessuna descrizione aggiuntiva.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {selectedSection ? (
          canSubmitComments ? (
            <aside className="panel-card expert-review-comments-panel expert-review-comments-composer-panel">
              <SectionCommentComposer
                canSubmitComments={canSubmitComments}
                consultationId={consultationId}
                key={selectedSection.id}
                section={selectedSection}
              />
            </aside>
          ) : (
            <aside className="panel-card expert-review-comments-panel expert-review-comments-composer-panel">
              <div className="expert-review-composer">
                <p className="form-success expert-review-inline-feedback">
                  In questa fase puoi solo consultare i commenti che hai gia&apos; inserito.
                </p>
              </div>
            </aside>
          )
        ) : null}
      </div>
    </section>
  );
}
