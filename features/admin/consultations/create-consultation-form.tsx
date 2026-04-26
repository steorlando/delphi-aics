"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  createConsultationAction,
  type CreateConsultationFormState,
} from "@/features/admin/consultations/actions";

const initialCreateConsultationFormState: CreateConsultationFormState = {
  status: "idle",
};

export function CreateConsultationForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInstance, setModalInstance] = useState(0);
  const [lastCreatedConsultation, setLastCreatedConsultation] = useState<{
    id: string;
    message: string;
  } | null>(null);

  function handleOpenModal() {
    setModalInstance((current) => current + 1);
    setIsModalOpen(true);
  }

  return (
    <section className="panel-card panel-card-wide">
      <div className="section-heading">
        <span className="eyebrow">Nuova consultazione</span>
        <div className="section-heading-copy">
          <h2>Crea una consultazione</h2>
          <p>
            Apri il modale per definire il contenitore principale del documento.
            Le sezioni HTML verranno aggiunte subito dopo nella pagina di dettaglio.
          </p>
        </div>
      </div>

      {lastCreatedConsultation ? (
        <div className="success-callout">
          <p>{lastCreatedConsultation.message}</p>
          <Link
            className="primary-link"
            href={`/admin/consultations/${lastCreatedConsultation.id}`}
          >
            Apri la consultazione appena creata
          </Link>
        </div>
      ) : null}

      <div className="compact-form-actions">
        <button className="primary-button" onClick={handleOpenModal} type="button">
          Nuova consultazione
        </button>
      </div>

      {isModalOpen ? (
        <CreateConsultationModal
          key={modalInstance}
          onClose={() => setIsModalOpen(false)}
          onCreated={(createdConsultationId, message) => {
            setLastCreatedConsultation({
              id: createdConsultationId,
              message,
            });
            setIsModalOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function CreateConsultationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (createdConsultationId: string, message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createConsultationAction,
    initialCreateConsultationFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success" && state.createdConsultationId && state.message) {
      formRef.current?.reset();
      onCreated(state.createdConsultationId, state.message);
    }
  }, [onCreated, state.createdConsultationId, state.message, state.status]);

  return (
    <div
      aria-labelledby="create-consultation-title"
      aria-modal="true"
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-card modal-card-wide"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card-header">
          <div>
            <span className="eyebrow">Nuova consultazione</span>
            <h3 id="create-consultation-title">Crea una consultazione</h3>
          </div>
          <button
            aria-label="Chiudi creazione consultazione"
            className="secondary-button small-button"
            onClick={onClose}
            type="button"
          >
            Chiudi
          </button>
        </div>

        {state.status === "error" && state.message ? (
          <p className="form-error">{state.message}</p>
        ) : null}

        <form ref={formRef} action={formAction} className="auth-form">
          <div className="two-column-grid">
            <label className="field">
              <span>Titolo consultazione</span>
              <input
                name="title"
                placeholder="Consultazione Delphi sul documento di policy"
                required
                type="text"
              />
            </label>

            <label className="field">
              <span>Titolo documento</span>
              <input
                name="documentTitle"
                placeholder="Bozza documento AICS"
                type="text"
              />
            </label>
          </div>

          <div className="two-column-grid">
            <label className="field">
              <span>Descrizione documento</span>
              <textarea
                name="documentDescription"
                placeholder="Breve descrizione del documento da sottoporre alla consultazione."
                rows={4}
              />
            </label>

            <label className="field">
              <span>Istruzioni per questa fase</span>
              <textarea
                name="description"
                placeholder="Contesto, obiettivo e note operative per gli amministratori."
                rows={4}
              />
            </label>
          </div>

          <div className="compact-form-actions modal-form-actions">
            <button className="primary-button" disabled={isPending} type="submit">
              {isPending ? "Creazione in corso..." : "Crea consultazione"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
