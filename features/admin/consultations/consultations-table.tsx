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
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Consultazione</th>
            <th scope="col">Stato</th>
            <th scope="col">Documento</th>
            <th scope="col">Commenti</th>
            <th scope="col">Ultimo commento</th>
            <th scope="col">Aggiornata</th>
            <th scope="col">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((consultation) => (
            <tr key={consultation.id}>
              <td>
                <strong>{consultation.title}</strong>
              </td>
              <td>{formatConsultationStateLabel(consultation.current_state)}</td>
              <td>{consultation.document_title || "Documento non ancora indicato"}</td>
              <td>
                {consultation.comment_count}{" "}
                {consultation.comment_count === 1 ? "commento" : "commenti"}
              </td>
              <td>
                {consultation.latest_comment_created_at
                  ? formatDateTime(consultation.latest_comment_created_at)
                  : "Nessun commento"}
              </td>
              <td>{formatDate(consultation.updated_at)}</td>
              <td>
                <div className="table-action-stack">
                  <Link
                    className="secondary-button small-button"
                    href={`/admin/consultations/${consultation.id}`}
                  >
                    Apri dettaglio
                  </Link>
                  <DeleteConsultationButton
                    consultationId={consultation.id}
                    consultationLabel={consultation.title}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
