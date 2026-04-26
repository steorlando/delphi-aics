"use client";

import { useActionState } from "react";
import {
  updateConsultationAction,
  type UpdateConsultationFormState,
} from "@/features/admin/consultations/actions";
import { CollapsiblePanel } from "@/features/admin/consultations/collapsible-panel";
import {
  getConsultationStateSelectOptions,
  type ConsultationDirectoryEntry,
} from "@/features/admin/consultations/shared";

type ConsultationSettingsFormProps = {
  consultation: ConsultationDirectoryEntry;
  embedded?: boolean;
  participantCount?: number;
};

const initialUpdateConsultationState: UpdateConsultationFormState = {
  status: "idle",
  message: "",
};

export function ConsultationSettingsForm({
  consultation,
  embedded = false,
  participantCount = 0,
}: ConsultationSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateConsultationAction,
    initialUpdateConsultationState,
  );
  const isPhaseOneBlocked =
    participantCount < 1 && consultation.current_state !== "phase_1_open";

  const formContent = (
    <>
      {state.status === "error" && state.message ? (
        <p className="form-error">{state.message}</p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="form-success">{state.message}</p>
      ) : null}

      <form action={formAction} className="auth-form">
        <input name="consultationId" type="hidden" value={consultation.id} />
        <input
          name="isActive"
          type="hidden"
          value={consultation.is_active ? "true" : "false"}
        />

        <div className="two-column-grid">
          <label className="field">
            <span>Titolo consultazione</span>
            <input defaultValue={consultation.title} name="title" required type="text" />
          </label>

          <label className="field">
            <span>Titolo documento</span>
            <input
              defaultValue={consultation.document_title ?? ""}
              name="documentTitle"
              type="text"
            />
          </label>
        </div>

        <div className="two-column-grid">
          <label className="field">
            <span>Fase consultazione</span>
            <select defaultValue={consultation.current_state} name="currentState">
              {getConsultationStateSelectOptions(consultation.current_state).map((option) => (
                <option
                  disabled={isPhaseOneBlocked && option.value === "phase_1_open"}
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <p className="field-hint">
              La UI mostra le 5 fasi operative principali. Alcuni stati avanzati
              del database restano comunque disponibili internamente.
            </p>
            {isPhaseOneBlocked ? (
              <p className="field-hint">
                Per passare a <strong>Commenti</strong> devi prima assegnare almeno
                un expert alla consultazione. Attualmente gli expert assegnati sono{" "}
                <strong>{participantCount}</strong>.
              </p>
            ) : (
              <p className="field-hint">
                Expert assegnati alla consultazione: <strong>{participantCount}</strong>.
              </p>
            )}
          </label>
        </div>

        <label className="field">
          <span>Descrizione documento</span>
          <textarea
            defaultValue={consultation.document_description ?? ""}
            name="documentDescription"
            rows={4}
          />
        </label>

        <label className="field">
          <span>Istruzioni per questa fase</span>
          <textarea
            defaultValue={consultation.description ?? ""}
            name="description"
            rows={4}
          />
        </label>

        <div className="compact-form-actions">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "Salvataggio..." : "Salva impostazioni"}
          </button>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return <div className="consultation-settings-embedded">{formContent}</div>;
  }

  return (
    <CollapsiblePanel
      defaultOpen={false}
      eyebrow="Impostazioni"
      forceOpen={state.status !== "idle"}
      title="Configurazione consultazione"
    >
      {formContent}
    </CollapsiblePanel>
  );
}
