"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  createAdminAction,
  type CreateAdminFormState,
} from "@/features/admin/admins/actions";

const initialCreateAdminFormState: CreateAdminFormState = {
  status: "idle",
};

export function CreateAdminForm() {
  const [state, formAction, isPending] = useActionState(
    createAdminAction,
    initialCreateAdminFormState,
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
        <span className="eyebrow">Accesso amministrativo</span>
        <h2>Crea account amministratore</h2>
        <p>
          Crea il profilo admin e invia subito l&apos;invito via email per il primo
          accesso.
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
            Il nuovo amministratore ricevera&apos; il link per completare la password
            personale al primo accesso.
          </p>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={formAction}
        className="auth-form compact-form compact-create-form"
      >
        <div className="compact-create-fields">
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
              placeholder="admin@example.com"
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
              {isPending ? "Creazione e invio invito..." : "Crea admin e invia invito"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
