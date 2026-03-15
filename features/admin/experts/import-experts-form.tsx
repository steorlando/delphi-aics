"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import {
  importExpertsAction,
  type ImportExpertsFormState,
} from "@/features/admin/experts/actions";

const initialImportExpertsFormState: ImportExpertsFormState = {
  status: "idle",
};

export function ImportExpertsForm() {
  const [state, formAction, isPending] = useActionState(
    importExpertsAction,
    initialImportExpertsFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success" || state.status === "partial") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <section className="panel-card compact-panel compact-import-panel">
      <div className="compact-create-header">
        <span className="eyebrow">Importazione massiva</span>
        <h2>Carica esperti da CSV</h2>
        <p>
          Ogni riga valida crea l&apos;account esperto e invia subito l&apos;email di invito
          Supabase per il primo accesso.
        </p>
      </div>

      <div className="import-help">
        <p className="muted">
          Intestazioni accettate: <strong>first_name</strong>,{" "}
          <strong>last_name</strong>, <strong>email</strong>.{" "}
          <strong>institution_name</strong> e&apos; opzionale.
        </p>
        <p className="muted">
          Sono accettate anche intestazioni italiane come <strong>nome</strong>,{" "}
          <strong>cognome</strong> e <strong>istituzione</strong>. Per sicurezza,
          importa al massimo 50 esperti per volta.
        </p>
      </div>

      {state.status === "error" ? (
        <p className="form-error">{state.message}</p>
      ) : null}

      {state.status === "success" || state.status === "partial" ? (
        <div className="success-callout">
          <p>{state.message}</p>
          {state.summary ? (
            <p className="muted">
              Righe elaborate: <strong>{state.summary.processed}</strong>. Account creati:{" "}
              <strong>{state.summary.created}</strong>. Errori:{" "}
              <strong>{state.summary.failed}</strong>.
            </p>
          ) : null}
        </div>
      ) : null}

      {state.failures && state.failures.length > 0 ? (
        <div className="import-results">
          <h3>Righe da correggere</h3>
          <ul className="import-results-list">
            {state.failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={formAction}
        className="auth-form compact-form compact-import-form"
      >
        <label className="field">
          <span>File CSV</span>
          <input accept=".csv,text/csv" name="csvFile" required type="file" />
        </label>

        <div className="compact-form-actions">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "Importazione e invio inviti..." : "Importa CSV e invia inviti"}
          </button>
        </div>
      </form>
    </section>
  );
}
