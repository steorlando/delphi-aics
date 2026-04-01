"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  restoreAdminConsultationCommentAction,
  type RestoreAdminConsultationCommentFormState,
} from "@/features/admin/consultations/actions";
import type {
  AdminConsultationCommentEntry,
  DocumentSectionEntry,
} from "@/features/admin/consultations/shared";
import type { ExpertDirectoryEntry } from "@/features/admin/experts/queries";
import { formatExpertCommentPriorityLabel } from "@/features/expert/consultations/shared";

type DeletedCommentsListProps = {
  comments: AdminConsultationCommentEntry[];
  consultationId: string;
  experts: ExpertDirectoryEntry[];
  sections: DocumentSectionEntry[];
};

const initialState: RestoreAdminConsultationCommentFormState = {
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

function getExpertDisplayLabel(expert: ExpertDirectoryEntry | null) {
  if (!expert) {
    return "Esperto non disponibile";
  }

  const name = `${expert.first_name} ${expert.last_name}`.trim();

  return name || expert.email;
}

function RestoreDeletedCommentCard({
  comment,
  consultationId,
  expert,
  section,
}: {
  comment: AdminConsultationCommentEntry;
  consultationId: string;
  expert: ExpertDirectoryEntry | null;
  section: DocumentSectionEntry | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    restoreAdminConsultationCommentAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <article className="panel-card panel-card-wide deleted-comment-card">
      <div className="deleted-comment-card-header">
        <div className="deleted-comment-card-main">
          <div className="deleted-comment-card-topline">
            <h2 className="deleted-comment-card-title">{comment.title}</h2>
            <span className="deleted-comment-card-context">
              {getExpertDisplayLabel(expert)}
              {" "}· {expert?.institution_name || "Istituzione non indicata"}
            </span>
          </div>

          <p className="deleted-comment-card-subtitle">
            {section?.title || "Sezione non disponibile"}
            {" "}· {formatExpertCommentPriorityLabel(comment.priority)}
          </p>
        </div>

        <form action={formAction} className="deleted-comment-restore-form">
          <input name="commentId" type="hidden" value={comment.id} />
          <input name="consultationId" type="hidden" value={consultationId} />
          <button
            className="primary-button small-button"
            disabled={isPending}
            type="submit"
          >
            Ripristina
          </button>
        </form>
      </div>

      {state.status === "error" && state.message ? (
        <p className="form-error">{state.message}</p>
      ) : null}

      <div className="deleted-comment-meta">
        <span>
          <strong>Eliminato il:</strong> {formatCommentDate(comment.updated_at)}
        </span>
        <span>
          <strong>Creato il:</strong> {formatCommentDate(comment.created_at)}
        </span>
      </div>

      {comment.body_text ? (
        <p className="expert-review-comment-body">{comment.body_text}</p>
      ) : (
        <p className="muted expert-review-comment-body">
          Nessuna descrizione aggiuntiva.
        </p>
      )}
    </article>
  );
}

export function DeletedCommentsList({
  comments,
  consultationId,
  experts,
  sections,
}: DeletedCommentsListProps) {
  const expertsById = useMemo(
    () => new Map(experts.map((expert) => [expert.id, expert])),
    [experts],
  );
  const sectionsById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  if (comments.length === 0) {
    return (
      <section className="panel-card panel-card-wide">
        <div className="section-heading">
          <span className="eyebrow">Archivio commenti</span>
          <div className="section-heading-copy">
            <h2>Nessun commento eliminato</h2>
            <p>
              In questa consultazione non ci sono commenti inattivi da
              ripristinare.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="deleted-comments-list">
      {comments.map((comment) => (
        <RestoreDeletedCommentCard
          comment={comment}
          consultationId={consultationId}
          expert={expertsById.get(comment.expert_profile_id) ?? null}
          key={comment.id}
          section={sectionsById.get(comment.section_id) ?? null}
        />
      ))}
    </section>
  );
}
