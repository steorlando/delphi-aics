"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDocumentSectionAction,
  updateDocumentSectionAction,
  type DeleteDocumentSectionFormState,
  type UpdateDocumentSectionFormState,
} from "@/features/admin/consultations/actions";
import { SectionBodyEditor } from "@/features/admin/consultations/section-body-editor";
import {
  slugifySectionTitle,
  type DocumentSectionEntry,
} from "@/features/admin/consultations/shared";

type DocumentSectionsListProps = {
  sections: DocumentSectionEntry[];
};

const initialUpdateState: UpdateDocumentSectionFormState = {
  status: "idle",
  message: "",
};

const initialDeleteState: DeleteDocumentSectionFormState = {
  status: "idle",
  message: "",
};

function SectionPreview({
  section,
  isOpen,
  onEdit,
  onToggle,
}: {
  section: DocumentSectionEntry;
  isOpen: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <article className="section-index-card">
      <div className="section-index-header">
        <button
          aria-expanded={isOpen}
          className="section-index-trigger"
          onClick={onToggle}
          type="button"
        >
          <div className="section-index-trigger-main">
            <span className="section-index-order">#{section.order_index}</span>
            <div className="section-index-copy">
              <strong>{section.title}</strong>
              <span>
                {section.reference_label || "Senza riferimento"} ·{" "}
                {section.is_active ? "Attiva" : "Inattiva"}
              </span>
            </div>
          </div>
        </button>

        <div className="section-index-header-actions">
          {isOpen ? (
            <button
              className="primary-button small-button"
              onClick={onEdit}
              type="button"
            >
              Modifica sezione
            </button>
          ) : null}

          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? `Chiudi ${section.title}` : `Apri ${section.title}`}
            className="section-index-trigger-icon-button"
            onClick={onToggle}
            type="button"
          >
            <span aria-hidden="true" className="section-index-trigger-icon">
              {isOpen ? "−" : "+"}
            </span>
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="section-index-preview">
          <div className="section-index-meta">
            <span>
              Slug: <strong>{section.slug}</strong>
            </span>
            <span>
              Riferimento: <strong>{section.reference_label || "Non indicato"}</strong>
            </span>
          </div>

          <div className="csv-example">
            <strong>Anteprima HTML</strong>
            <div
              dangerouslySetInnerHTML={{
                __html: section.body_text ?? "<p class='muted'>Nessun contenuto.</p>",
              }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function EditDocumentSectionModal({
  section,
  onClose,
}: {
  section: DocumentSectionEntry;
  onClose: () => void;
}) {
  const router = useRouter();
  const [updateState, updateAction, isUpdating] = useActionState(
    updateDocumentSectionAction,
    initialUpdateState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteDocumentSectionAction,
    initialDeleteState,
  );
  const [title, setTitle] = useState(section.title);
  const [slug, setSlug] = useState(section.slug);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(true);

  useEffect(() => {
    setTitle(section.title);
    setSlug(section.slug);
    setIsSlugManuallyEdited(true);
  }, [section.id, section.slug, section.title]);

  useEffect(() => {
    if (updateState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, updateState.status]);

  useEffect(() => {
    if (deleteState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [deleteState.status, onClose, router]);

  return (
    <div
      aria-labelledby="edit-section-title"
      aria-modal="true"
      className="modal-backdrop modal-backdrop-top"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-card modal-card-editor"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card-header">
          <div>
            <span className="eyebrow">Modifica</span>
            <h3 id="edit-section-title">{section.title}</h3>
          </div>
          <button
            aria-label="Chiudi modifica sezione"
            className="secondary-button small-button"
            onClick={onClose}
            type="button"
          >
            Chiudi
          </button>
        </div>

        {updateState.status === "error" && updateState.message ? (
          <p className="form-error">{updateState.message}</p>
        ) : null}

        {deleteState.status === "error" && deleteState.message ? (
          <p className="form-error">{deleteState.message}</p>
        ) : null}

        <form action={updateAction} className="auth-form" key={section.id}>
          <input name="sectionId" type="hidden" value={section.id} />
          <input name="consultationId" type="hidden" value={section.consultation_id} />

          <div className="two-column-grid">
            <label className="field">
              <span>Titolo sezione</span>
              <input
                name="title"
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);

                  if (!isSlugManuallyEdited) {
                    setSlug(slugifySectionTitle(nextTitle));
                  }
                }}
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
                    setSlug(slugifySectionTitle(title));
                    return;
                  }

                  setSlug(slugifySectionTitle(slug));
                }}
                onChange={(event) => {
                  const nextSlug = event.target.value;
                  setSlug(nextSlug);
                  setIsSlugManuallyEdited(Boolean(nextSlug));
                }}
                required
                type="text"
                value={slug}
              />
              <p className="field-hint">
                Identificatore tecnico stabile della sezione. Se lo svuoti,
                verra&apos; rigenerato dal titolo.
              </p>
            </label>
          </div>

          <div className="two-column-grid">
            <label className="field">
              <span>Ordine</span>
              <input
                defaultValue={String(section.order_index)}
                min={1}
                name="orderIndex"
                required
                type="number"
              />
            </label>

            <label className="field">
              <span>Riferimento</span>
              <input
                defaultValue={section.reference_label ?? ""}
                name="referenceLabel"
                type="text"
              />
              <p className="field-hint">
                Campo opzionale per il riferimento umano del documento originale,
                ad esempio “Sezione 1” o “Paragrafo 2.3”.
              </p>
            </label>
          </div>

          <SectionBodyEditor
            initialValue={section.body_text ?? ""}
            inputName="bodyText"
          />

          <label className="field">
            <span>Sezione attiva</span>
            <select
              defaultValue={section.is_active ? "true" : "false"}
              name="isActive"
            >
              <option value="true">Si&apos;</option>
              <option value="false">No</option>
            </select>
          </label>

          <div className="section-modal-actions">
            <button className="primary-button" disabled={isUpdating} type="submit">
              {isUpdating ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </div>
        </form>

        <form
          action={deleteAction}
          className="inline-action-form"
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Vuoi eliminare definitivamente la sezione "${section.title}"?`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input name="sectionId" type="hidden" value={section.id} />
          <input name="consultationId" type="hidden" value={section.consultation_id} />
          <button
            className="secondary-button destructive-button"
            disabled={isDeleting}
            type="submit"
          >
            {isDeleting ? "Eliminazione..." : "Elimina sezione"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DocumentSectionsList({ sections }: DocumentSectionsListProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<DocumentSectionEntry | null>(null);

  return (
    <>
      <div className="section-index-list">
        {sections.map((section) => {
          const isOpen = expandedSectionId === section.id;

          return (
            <SectionPreview
              isOpen={isOpen}
              key={section.id}
              onEdit={() => setEditingSection(section)}
              onToggle={() =>
                setExpandedSectionId((current) =>
                  current === section.id ? null : section.id,
                )
              }
              section={section}
            />
          );
        })}
      </div>

      {editingSection ? (
        <EditDocumentSectionModal
          onClose={() => setEditingSection(null)}
          section={editingSection}
        />
      ) : null}
    </>
  );
}
