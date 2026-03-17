"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import {
  createDocumentSectionAction,
  type CreateDocumentSectionFormState,
} from "@/features/admin/consultations/actions";
import { CollapsiblePanel } from "@/features/admin/consultations/collapsible-panel";
import { SectionBodyEditor } from "@/features/admin/consultations/section-body-editor";
import { slugifySectionTitle } from "@/features/admin/consultations/shared";
import type { StoredFigureEntry } from "@/features/admin/figures/shared";

type CreateDocumentSectionFormProps = {
  availableFigures: StoredFigureEntry[];
  consultationId: string;
  nextOrderIndex: number;
};

const initialCreateDocumentSectionState: CreateDocumentSectionFormState = {
  status: "idle",
};

export function CreateDocumentSectionForm({
  availableFigures,
  consultationId,
  nextOrderIndex,
}: CreateDocumentSectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    createDocumentSectionAction,
    initialCreateDocumentSectionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setTitle("");
      setSlug("");
      setIsSlugManuallyEdited(false);
    }
  }, [state.status]);

  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setSlug(slugifySectionTitle(title));
    }
  }, [isSlugManuallyEdited, title]);

  return (
    <CollapsiblePanel
      defaultOpen={false}
      eyebrow="Sezioni documento"
      forceOpen={state.status !== "idle"}
      title="Aggiungi una nuova sezione"
    >
      {state.status === "error" && state.message ? (
        <p className="form-error">{state.message}</p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p className="form-success">{state.message}</p>
      ) : null}

      <form ref={formRef} action={formAction} className="auth-form">
        <input name="consultationId" type="hidden" value={consultationId} />

        <div className="two-column-grid">
          <label className="field">
            <span>Titolo sezione</span>
            <input
              name="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Introduzione"
              required
              type="text"
              value={title}
            />
          </label>

          <label className="field">
            <span>Slug</span>
            <input
              name="slug"
              onBlur={() => {
                if (!slug) {
                  setIsSlugManuallyEdited(false);
                  return;
                }

                setSlug(slugifySectionTitle(slug));
              }}
              onChange={(event) => {
                const nextSlug = event.target.value;
                setSlug(nextSlug);
                setIsSlugManuallyEdited(Boolean(nextSlug));
              }}
              placeholder="introduzione"
              type="text"
              value={slug}
            />
            <p className="field-hint">
              Si compila automaticamente dal titolo, ma puoi modificarlo se ti
              serve un identificatore tecnico diverso.
            </p>
          </label>
        </div>

        <div className="two-column-grid">
          <label className="field">
            <span>Ordine</span>
            <input
              defaultValue={String(nextOrderIndex)}
              min={1}
              name="orderIndex"
              required
              type="number"
            />
          </label>

          <label className="field">
            <span>Riferimento</span>
            <input
              name="referenceLabel"
              placeholder="Sezione 1"
              type="text"
            />
            <p className="field-hint">
              Etichetta editoriale opzionale, utile se il documento originale
              usa riferimenti come “Sezione 1”, “Paragrafo 2.3” o “Articolo 5”.
            </p>
          </label>
        </div>

        <SectionBodyEditor
          availableFigures={availableFigures}
          inputName="bodyText"
        />

        <label className="field">
          <span>Sezione attiva</span>
          <select defaultValue="true" name="isActive">
            <option value="true">Si&apos;</option>
            <option value="false">No</option>
          </select>
        </label>

        <div className="compact-form-actions">
          <button className="primary-button" disabled={isPending} type="submit">
            {isPending ? "Creazione sezione..." : "Aggiungi sezione"}
          </button>
        </div>
      </form>
    </CollapsiblePanel>
  );
}
