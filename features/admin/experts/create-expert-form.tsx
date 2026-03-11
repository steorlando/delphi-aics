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
    <section className="panel-card">
      <span className="eyebrow">Abilitazione esperti</span>
      <h2>Crea account esperto</h2>
      <p>
        Il nuovo esperto verra&apos; creato in Supabase Auth e nella tabella dei
        profili applicativi. Supabase inviera&apos; un&apos;email di invito cosi&apos; che
        l&apos;esperto possa impostare una password personale al primo accesso.
      </p>

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

      <form ref={formRef} action={formAction} className="auth-form">
        <div className="two-column-grid">
          <label className="field">
            <span>Nome</span>
            <input name="firstName" required type="text" />
          </label>

          <label className="field">
            <span>Cognome</span>
            <input name="lastName" required type="text" />
          </label>
        </div>

        <label className="field">
          <span>Istituzione</span>
          <input name="institutionName" type="text" />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="expert@example.com"
            required
            type="email"
          />
        </label>

        <button className="primary-button" disabled={isPending} type="submit">
          {isPending ? "Creazione e invio invito..." : "Crea esperto e invia invito"}
        </button>
      </form>
    </section>
  );
}
