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
};

const initialUpdateConsultationState: UpdateConsultationFormState = {
  status: "idle",
  message: "",
};

export function ConsultationSettingsForm({
  consultation,
}: ConsultationSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateConsultationAction,
    initialUpdateConsultationState,
  );

  return (
    <CollapsiblePanel
      defaultOpen={false}
      description="Qui gestisci i metadati principali e lo stato generale della consultazione. Le regole operative di apertura delle fasi saranno raffinate nel prossimo milestone."
      eyebrow="Impostazioni"
      forceOpen={state.status !== "idle"}
      title="Configurazione consultazione"
    >
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
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="field-hint">
              La UI mostra le 4 fasi operative principali. Alcuni stati avanzati
              del database restano comunque disponibili internamente.
            </p>
          </label>
        </div>

        <label className="field">
          <span>Descrizione consultazione</span>
          <textarea
            defaultValue={consultation.description ?? ""}
            name="description"
            rows={4}
          />
        </label>

        <label className="field">
          <span>Descrizione documento</span>
          <textarea
            defaultValue={consultation.document_description ?? ""}
            name="documentDescription"
            rows={4}
          />
        </label>

        <div className="compact-form-actions">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "Salvataggio..." : "Salva impostazioni"}
          </button>
        </div>
      </form>
    </CollapsiblePanel>
  );
}
