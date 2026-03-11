"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  createExpertAction,
  type CreateExpertFormState,
} from "@/features/admin/experts/actions";

const initialCreateExpertFormState: CreateExpertFormState = {
  status: "idle",
};

export function CreateExpertForm() {
  const [state, formAction, isPending] = useActionState(
    createExpertAction,
    initialCreateExpertFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <section className="panel-card compact-panel compact-create-panel">
      <div className="compact-create-header">
        <span className="eyebrow">Abilitazione esperti</span>
        <h2>Crea account esperto</h2>
        <p>
          Crea il profilo e invia subito l&apos;invito via email.
        </p>
      </div>

      {state.status === "error" ? (
        <p className="form-error">{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <div className="success-callout">
          <p>{state.message}</p>
          <p>
            Email: <strong>{state.createdEmail}</strong>
          </p>
          <p className="muted">
            Il link di invito portera&apos; l&apos;esperto al flusso di impostazione
            della password per il primo accesso.
          </p>
        </div>
      ) : null}

      <form ref={formRef} action={formAction} className="auth-form compact-form compact-create-form">
        <div className="compact-create-grid">
          <label className="field compact-inline-field">
            <span>Nome</span>
            <input name="firstName" required type="text" />
          </label>

          <label className="field compact-inline-field">
            <span>Cognome</span>
            <input name="lastName" required type="text" />
          </label>

          <label className="field compact-inline-field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              placeholder="expert@example.com"
              required
              type="email"
            />
          </label>

          <label className="field compact-inline-field">
            <span>Istituzione</span>
            <input name="institutionName" type="text" />
          </label>

          <div className="compact-form-actions compact-inline-action">
            <button className="primary-button compact-inline-button" disabled={isPending} type="submit">
              {isPending ? "Creazione e invio invito..." : "Crea esperto e invia invito"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
