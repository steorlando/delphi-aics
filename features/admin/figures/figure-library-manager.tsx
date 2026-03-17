"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteConsultationFigureAction,
  uploadConsultationFigureAction,
  type DeleteFigureFormState,
  type UploadFigureFormState,
} from "@/features/admin/figures/actions";
import {
  buildFigureHtmlSnippet,
  formatFigureFileSize,
  getAcceptedFigureMimeTypes,
  type StoredFigureEntry,
} from "@/features/admin/figures/shared";

type FigureLibraryManagerProps = {
  bucketName: string;
  bucketWasCreated: boolean;
  errorMessage: string | null;
  initialFigures: StoredFigureEntry[];
};

const initialUploadState: UploadFigureFormState = {
  message: "",
  status: "idle",
};

const initialDeleteState: DeleteFigureFormState = {
  message: "",
  status: "idle",
};

function mergeFiguresByPath(figures: StoredFigureEntry[]) {
  const figuresByPath = new Map<string, StoredFigureEntry>();

  for (const figure of figures) {
    figuresByPath.set(figure.path, figure);
  }

  return [...figuresByPath.values()];
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Data non disponibile";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function CopyButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [feedback, setFeedback] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback("copied");
      window.setTimeout(() => setFeedback("idle"), 1800);
    } catch {
      setFeedback("error");
      window.setTimeout(() => setFeedback("idle"), 1800);
    }
  }

  return (
    <button className="secondary-button small-button" onClick={handleCopy} type="button">
      {feedback === "copied"
        ? "Copiato"
        : feedback === "error"
          ? "Riprova"
          : label}
    </button>
  );
}

function DeleteFigureButton({
  figure,
  onDeleted,
}: {
  figure: StoredFigureEntry;
  onDeleted: (deletedPath: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    deleteConsultationFigureAction,
    initialDeleteState,
  );

  useEffect(() => {
    if (state.status === "success" && state.deletedPath) {
      onDeleted(state.deletedPath);
    }
  }, [onDeleted, state.deletedPath, state.status]);

  return (
    <form
      action={formAction}
      className="inline-action-form"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Vuoi eliminare definitivamente la figura "${figure.name}"?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="figurePath" type="hidden" value={figure.path} />
      <button
        className="secondary-button small-button destructive-button"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Eliminazione..." : "Elimina"}
      </button>
      {state.status === "error" && state.message ? (
        <p className="form-error compact-message">{state.message}</p>
      ) : null}
    </form>
  );
}

export function FigureLibraryManager({
  bucketName,
  bucketWasCreated,
  errorMessage,
  initialFigures,
}: FigureLibraryManagerProps) {
  const [figures, setFigures] = useState(initialFigures);
  const [uploadState, uploadAction, isUploading] = useActionState(
    uploadConsultationFigureAction,
    initialUploadState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setFigures(mergeFiguresByPath(initialFigures));
  }, [initialFigures]);

  useEffect(() => {
    if (uploadState.status === "success" && uploadState.figure) {
      formRef.current?.reset();
      setFigures((current) =>
        mergeFiguresByPath([uploadState.figure!, ...current]),
      );
    }
  }, [uploadState.figure, uploadState.status]);

  const sortedFigures = useMemo(
    () =>
      mergeFiguresByPath(figures).sort((left, right) => {
        const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightDate - leftDate;
      }),
    [figures],
  );

  return (
    <div className="admin-experts-layout">
      <section className="panel-card panel-card-wide admin-table-panel">
        <div className="section-heading">
          <span className="eyebrow">Archivio figure</span>
          <div className="section-heading-copy">
            <h2>Carica una nuova figura</h2>
            <p>
              Le immagini vengono salvate nel bucket pubblico <strong>{bucketName}</strong>
              {" "}di Supabase Storage. Dopo l&apos;upload puoi copiare l&apos;URL diretto
              o uno snippet HTML gia&apos; pronto da incollare nelle sezioni del documento.
            </p>
          </div>
        </div>

        {bucketWasCreated ? (
          <p className="form-success">
            Bucket figure configurato automaticamente. Non serve creare nulla a
            mano in Supabase, se la chiave service role e&apos; gia&apos; presente.
          </p>
        ) : null}

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        {uploadState.status === "success" && uploadState.message ? (
          <div className="success-callout">
            <p>{uploadState.message}</p>
            {uploadState.figure ? (
              <div className="figure-callout-actions">
                <CopyButton label="Copia URL" value={uploadState.figure.public_url} />
                <CopyButton
                  label="Copia snippet HTML"
                  value={buildFigureHtmlSnippet(uploadState.figure.public_url)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {uploadState.status === "error" && uploadState.message ? (
          <p className="form-error">{uploadState.message}</p>
        ) : null}

        <form ref={formRef} action={uploadAction} className="auth-form">
          <div className="two-column-grid">
            <label className="field">
              <span>File immagine</span>
              <input
                accept={getAcceptedFigureMimeTypes()}
                name="figureFile"
                required
                type="file"
              />
              <p className="field-hint">
                Formati ammessi: PNG, JPG, WEBP, GIF, SVG. Dimensione massima 8 MB.
              </p>
            </label>

            <label className="field">
              <span>Nome descrittivo</span>
              <input
                name="label"
                placeholder="schema-percorso-assistenziale"
                type="text"
              />
              <p className="field-hint">
                Opzionale. Serve solo a rendere il nome file piu&apos; leggibile nello
                storage e nell&apos;elenco.
              </p>
            </label>
          </div>

          <div className="compact-form-actions">
            <button className="primary-button" disabled={isUploading || Boolean(errorMessage)} type="submit">
              {isUploading ? "Caricamento..." : "Carica figura"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel-card panel-card-wide admin-table-panel">
        <div className="section-heading">
          <span className="eyebrow">Libreria</span>
          <div className="section-heading-copy">
            <h2>Figure disponibili</h2>
            <p>
              {sortedFigures.length === 0
                ? "Non hai ancora caricato nessuna figura."
                : `Sono presenti ${sortedFigures.length} ${sortedFigures.length === 1 ? "figura" : "figure"} disponibili per l'inserimento nell'HTML.`}
            </p>
          </div>
        </div>

        {sortedFigures.length === 0 ? (
          <p className="muted">
            Carica la prima immagine e poi incolla l&apos;URL o lo snippet HTML nel testo
            della sezione.
          </p>
        ) : (
          <div className="figure-library-list">
            {sortedFigures.map((figure) => (
              <article className="figure-library-card" key={figure.path}>
                <div className="figure-library-card-header">
                  <div className="figure-library-card-copy">
                    <strong>{figure.name}</strong>
                    <span>
                      {formatDateTime(figure.created_at)} · {formatFigureFileSize(figure.size_bytes)}
                      {figure.mime_type ? ` · ${figure.mime_type}` : ""}
                    </span>
                  </div>

                  <div className="figure-library-card-actions">
                    <Link
                      className="secondary-button small-button"
                      href={figure.public_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Apri file
                    </Link>
                    <CopyButton label="Copia URL" value={figure.public_url} />
                    <CopyButton
                      label="Copia snippet HTML"
                      value={buildFigureHtmlSnippet(figure.public_url)}
                    />
                    <DeleteFigureButton
                      figure={figure}
                      onDeleted={(deletedPath) =>
                        setFigures((current) =>
                          current.filter((entry) => entry.path !== deletedPath),
                        )
                      }
                    />
                  </div>
                </div>

                <label className="field">
                  <span>URL pubblico</span>
                  <input readOnly type="text" value={figure.public_url} />
                </label>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
