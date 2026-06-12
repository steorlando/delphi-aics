"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  deleteConsultationAction,
  type DeleteConsultationFormState,
} from "@/features/admin/consultations/actions";
import {
  formatConsultationStateLabel,
  type ConsultationDirectoryEntry,
} from "@/features/admin/consultations/shared";

type ConsultationsTableProps = {
  consultations: ConsultationDirectoryEntry[];
};

const initialDeleteState: DeleteConsultationFormState = {
  status: "idle",
  message: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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
        d="M4.5 7.5h15M9.75 3.75h4.5m-7.5 3.75.563 9.008A1.5 1.5 0 0 0 8.81 18h6.38a1.5 1.5 0 0 0 1.497-1.492L17.25 7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 10.5v4.5M13.5 10.5v4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function DeleteConsultationButton({
  consultationId,
  consultationLabel,
}: {
  consultationId: string;
  consultationLabel: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    deleteConsultationAction,
    initialDeleteState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form
      action={formAction}
      className="inline-action-form table-inline-action-form"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Vuoi eliminare definitivamente la consultazione "${consultationLabel}"? Questa operazione rimuovera' anche le sezioni collegate.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="consultationId" type="hidden" value={consultationId} />
      <button
        aria-label={`Elimina ${consultationLabel}`}
        className="secondary-button small-button icon-action-button destructive-button"
        disabled={isPending}
        title="Elimina consultazione"
        type="submit"
      >
        <TrashIcon />
        <span className="sr-only">
          {isPending ? "Eliminazione..." : "Elimina"}
        </span>
      </button>
      {state.status === "error" && state.message ? (
        <p className="form-error compact-message">{state.message}</p>
      ) : null}
    </form>
  );
}

export function ConsultationsTable({ consultations }: ConsultationsTableProps) {
  return (
    <div className="admin-consultations-card-grid">
      {consultations.map((consultation) => (
        <article className="consultation-directory-card" key={consultation.id}>
          <Link
            aria-label={`Apri dettaglio consultazione ${consultation.title}`}
            className="consultation-directory-card-link"
            href={`/admin/consultations/${consultation.id}`}
          >
            <span className="sr-only">Apri dettaglio</span>
          </Link>

          <div className="consultation-directory-card-header">
            <div className="consultation-directory-title-group">
              <span className="expert-consultation-state-badge">
                {formatConsultationStateLabel(consultation.current_state)}
              </span>
              <h3>{consultation.title}</h3>
            </div>
            <DeleteConsultationButton
              consultationId={consultation.id}
              consultationLabel={consultation.title}
            />
          </div>

          <div className="consultation-directory-document">
            <span>Documento</span>
            <strong>{consultation.document_title || "Documento non ancora indicato"}</strong>
          </div>

          <dl className="consultation-directory-stats">
            <div>
              <dt>Creata</dt>
              <dd>{formatDate(consultation.created_at)}</dd>
            </div>
            <div>
              <dt>Aggiornata</dt>
              <dd>{formatDate(consultation.updated_at)}</dd>
            </div>
            <div>
              <dt>Esperti invitati</dt>
              <dd>{consultation.invited_expert_count}</dd>
            </div>
            <div>
              <dt>Primo accesso</dt>
              <dd>
                {consultation.first_access_expert_count}
                <span> / {consultation.invited_expert_count}</span>
              </dd>
            </div>
            <div>
              <dt>Esperti con commenti</dt>
              <dd>
                {consultation.commenting_expert_count}
                <span> / {consultation.invited_expert_count}</span>
              </dd>
            </div>
            <div>
              <dt>Commenti totali</dt>
              <dd>{consultation.comment_count}</dd>
            </div>
          </dl>

          <div className="consultation-directory-footer">
            <span>
              Ultimo commento:{" "}
              {consultation.latest_comment_created_at
                ? formatDateTime(consultation.latest_comment_created_at)
                : "nessun commento"}
            </span>
            <span>Apri dettaglio</span>
          </div>
        </article>
      ))}
    </div>
  );
}
