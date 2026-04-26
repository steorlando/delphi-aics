"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  deleteExpertPhase2VoteNoteAction,
  saveExpertPhase2VoteNoteAction,
  saveExpertPhase2VoteAction,
  type SaveExpertPhase2VoteNoteFormState,
  type SaveExpertPhase2VoteFormState,
} from "@/features/expert/consultations/actions";
import {
  expertPhase2VoteOptions,
  type ExpertConsultationSectionEntry,
  type ExpertPhase2VoteScore,
  type ExpertPhase2VotableCommentEntry,
} from "@/features/expert/consultations/shared";
import { getSanitizedDocumentHtml } from "@/lib/html/sanitize";

type ExpertConsultationPhase2VotingProps = {
  canSubmitVotes: boolean;
  consultationId: string;
  sections: ExpertConsultationSectionEntry[];
  votableComments: ExpertPhase2VotableCommentEntry[];
};

type Phase2VoteFormProps = {
  canSubmitVotes: boolean;
  consultationId: string;
  noteAction?: ReactNode;
  votableComment: ExpertPhase2VotableCommentEntry;
};

const initialVoteState: SaveExpertPhase2VoteFormState = {
  status: "idle",
  message: "",
};

const initialVoteNoteState: SaveExpertPhase2VoteNoteFormState = {
  status: "idle",
  message: "",
};

function getInitialSelectedSectionId(
  sections: ExpertConsultationSectionEntry[],
  votableComments: ExpertPhase2VotableCommentEntry[],
) {
  const sectionIdsWithPublishedComments = new Set(
    votableComments.map((comment) => comment.section_id),
  );

  return sections.find((section) => sectionIdsWithPublishedComments.has(section.id))?.id
    ?? sections[0]?.id
    ?? "";
}

function Phase2CurrentUserNote({
  note,
}: {
  note: ExpertPhase2VotableCommentEntry["current_user_note"];
}) {
  if (!note) {
    return null;
  }

  return (
    <div className="phase-2-note-list" aria-label="Il tuo commento al voto">
      <span className="phase-2-note-list-title">Il tuo commento</span>
      <article className="phase-2-note-item">
        <p>{note.body_text}</p>
      </article>
    </div>
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

function Phase2VoteNoteInlineForm({
  consultationId,
  onClose,
  votableComment,
}: {
  consultationId: string;
  onClose: () => void;
  votableComment: ExpertPhase2VotableCommentEntry;
}) {
  const router = useRouter();
  const [noteText, setNoteText] = useState(
    votableComment.current_user_note?.body_text ?? "",
  );
  const [state, formAction, isPending] = useActionState(
    saveExpertPhase2VoteNoteAction,
    initialVoteNoteState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteExpertPhase2VoteNoteAction,
    initialVoteNoteState,
  );

  useEffect(() => {
    setNoteText(votableComment.current_user_note?.body_text ?? "");
  }, [votableComment.current_user_note?.body_text]);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [deleteState.status, onClose, router]);

  return (
    <form action={formAction} className="auth-form phase-2-note-inline-form">
      <input name="consultationId" type="hidden" value={consultationId} />
      <input name="commentId" type="hidden" value={votableComment.id} />

      <label className="field">
        <span>
          {votableComment.current_user_note ? "Modifica il tuo commento" : "Il tuo commento"}
        </span>
        <textarea
          autoFocus
          disabled={isPending || isDeleting}
          maxLength={2500}
          name="bodyText"
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Se vuoi, aggiungi una motivazione o una precisazione sul tuo voto"
          required
          value={noteText}
        />
      </label>

      <div className="phase-2-note-inline-meta">
        <span>{noteText.length}/2500 caratteri</span>
      </div>

      {state.status === "error" && state.message ? (
        <p className="form-error expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {deleteState.status === "error" && deleteState.message ? (
        <p className="form-error expert-review-inline-feedback">{deleteState.message}</p>
      ) : null}

      <div className="compact-form-actions expert-review-form-actions">
        <button
          className="secondary-button small-button"
          disabled={isPending || isDeleting}
          onClick={onClose}
          type="button"
        >
          Annulla
        </button>

        {votableComment.current_user_note ? (
          <button
            aria-label={isDeleting ? "Eliminazione commento in corso" : "Elimina commento"}
            className="secondary-button small-button icon-action-button destructive-button"
            disabled={isPending || isDeleting}
            formAction={deleteAction}
            type="submit"
          >
            <TrashIcon />
            <span className="sr-only">Elimina commento</span>
          </button>
        ) : null}

        <button
          className="primary-button small-button"
          disabled={isPending || isDeleting}
          type="submit"
        >
          {isPending ? "Salvataggio..." : "Salva commento"}
        </button>
      </div>
    </form>
  );
}

function Phase2VoteForm({
  canSubmitVotes,
  consultationId,
  noteAction,
  votableComment,
}: Phase2VoteFormProps) {
  const router = useRouter();
  const [selectedScore, setSelectedScore] = useState<ExpertPhase2VoteScore | null>(
    votableComment.current_vote_score,
  );
  const [state, formAction, isPending] = useActionState(
    saveExpertPhase2VoteAction,
    initialVoteState,
  );

  useEffect(() => {
    setSelectedScore(votableComment.current_vote_score);
  }, [votableComment.current_vote_score]);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  useEffect(() => {
    if (state.status === "error") {
      setSelectedScore(votableComment.current_vote_score);
    }
  }, [state.status, votableComment.current_vote_score]);

  return (
    <form action={formAction} className="phase-2-vote-form">
      <input name="consultationId" type="hidden" value={consultationId} />
      <input name="commentId" type="hidden" value={votableComment.id} />

      <div
        aria-label={`Valutazione per il commento ${votableComment.display_title}`}
        className="phase-2-vote-scale"
        role="radiogroup"
      >
        {expertPhase2VoteOptions.map((option) => {
          const isSelected = selectedScore === option.value;

          return (
            <button
              aria-checked={isSelected}
              aria-label={`${option.value}: ${option.label}`}
              className={`phase-2-vote-option${isSelected ? " phase-2-vote-option-selected" : ""}`}
              disabled={!canSubmitVotes || isPending}
              key={option.value}
              name="score"
              onClick={() => setSelectedScore(option.value)}
              role="radio"
              type="submit"
              value={String(option.value)}
            >
              <span aria-hidden="true">{option.value}</span>
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>

      {selectedScore === null || !canSubmitVotes || noteAction ? (
        <div className="phase-2-vote-meta">
          {selectedScore === null ? (
            <span className="phase-2-vote-current">Nessun voto espresso</span>
          ) : null}

          {!canSubmitVotes ? (
            <span className="expert-review-comment-date">
              Votazione in sola lettura
            </span>
          ) : null}

          {noteAction}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="form-error expert-review-inline-feedback">{state.message}</p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="form-success expert-review-inline-feedback">{state.message}</p>
      ) : null}
    </form>
  );
}

function Phase2VotableCommentCard({
  canSubmitVotes,
  consultationId,
  votableComment,
}: Phase2VoteFormProps) {
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const noteAction = canSubmitVotes ? (
    <button
      className="phase-2-note-link"
      onClick={() => setIsNoteEditorOpen((current) => !current)}
      type="button"
    >
      {isNoteEditorOpen
        ? "Chiudi"
        : votableComment.current_user_note
          ? "Modifica commento"
          : "Commenta"}
    </button>
  ) : null;

  return (
    <article
      className={`expert-review-comment-card expert-review-comment-card-compact phase-2-vote-card${isNoteEditorOpen ? " phase-2-vote-card-editing-note" : ""}`}
    >
      <div className="expert-review-comment-row">
        <div className="admin-consultation-comment-row-copy">
          <strong className="expert-review-comment-row-title">
            {votableComment.display_title}
          </strong>
        </div>
      </div>

      <div className="expert-review-comment-details phase-2-vote-card-details">
        {votableComment.display_body ? (
          <p className="expert-review-comment-body">
            {votableComment.display_body}
          </p>
        ) : (
          <p className="muted expert-review-comment-body">
            Nessuna descrizione aggiuntiva.
          </p>
        )}

        <Phase2VoteForm
          canSubmitVotes={canSubmitVotes}
          consultationId={consultationId}
          noteAction={noteAction}
          votableComment={votableComment}
        />

        {isNoteEditorOpen ? (
          <Phase2VoteNoteInlineForm
            consultationId={consultationId}
            onClose={() => setIsNoteEditorOpen(false)}
            votableComment={votableComment}
          />
        ) : (
          <Phase2CurrentUserNote note={votableComment.current_user_note} />
        )}
      </div>
    </article>
  );
}

export function ExpertConsultationPhase2Voting({
  canSubmitVotes,
  consultationId,
  sections,
  votableComments,
}: ExpertConsultationPhase2VotingProps) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(
    getInitialSelectedSectionId(sections, votableComments),
  );
  const commentsBySection = useMemo(
    () =>
      votableComments.reduce<Map<string, ExpertPhase2VotableCommentEntry[]>>((map, comment) => {
        const sectionComments = map.get(comment.section_id) ?? [];
        sectionComments.push(comment);
        map.set(comment.section_id, sectionComments);
        return map;
      }, new Map<string, ExpertPhase2VotableCommentEntry[]>()),
    [votableComments],
  );
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const selectedSectionComments = selectedSection
    ? commentsBySection.get(selectedSection.id) ?? []
    : [];

  useEffect(() => {
    const initialSelectedSectionId = getInitialSelectedSectionId(sections, votableComments);

    if (!selectedSectionId && initialSelectedSectionId) {
      setSelectedSectionId(initialSelectedSectionId);
      return;
    }

    if (selectedSectionId && !sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(initialSelectedSectionId);
    }
  }, [sections, selectedSectionId, votableComments]);

  function handleSectionSelect(sectionId: string) {
    setSelectedSectionId(sectionId);
    setIsNavCollapsed(true);
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
                    Seleziona una sezione per leggere il testo completo e votare i
                    commenti consolidati pubblicati per quella parte del documento.
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
                aria-controls={`phase-2-section-panel-${section.id}`}
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
        id={selectedSection ? `phase-2-section-panel-${selectedSection.id}` : undefined}
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

      <div className="expert-review-side-column phase-2-side-column">
        <section className="panel-card expert-review-comments-history phase-2-comments-history">
          {selectedSectionComments.length > 0 ? (
            <div className="expert-review-comment-list expert-review-comment-list-compact">
              {selectedSectionComments.map((comment) => (
                <Phase2VotableCommentCard
                  canSubmitVotes={canSubmitVotes}
                  consultationId={consultationId}
                  key={comment.id}
                  votableComment={comment}
                />
              ))}
            </div>
          ) : (
            <div className="expert-review-note">
              <strong>Nessun commento disponibile</strong>
              <p>
                Per questa sezione non risultano ancora commenti pubblicati nella fase
                di votazione.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
