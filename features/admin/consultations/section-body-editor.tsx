"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  buildFigureHtmlSnippetWithContent,
  type StoredFigureEntry,
} from "@/features/admin/figures/shared";

type SectionBodyEditorProps = {
  availableFigures?: StoredFigureEntry[];
  initialValue?: string | null;
  inputName: string;
};

type ToolbarAction = {
  label: string;
  command: string;
  value?: string;
};

const toolbarActions: ToolbarAction[] = [
  { label: "Grassetto", command: "bold" },
  { label: "Corsivo", command: "italic" },
  { label: "Sottolinea", command: "underline" },
  { label: "Titolo", command: "formatBlock", value: "h3" },
  { label: "Paragrafo", command: "formatBlock", value: "p" },
  { label: "Elenco", command: "insertUnorderedList" },
];

const unsupportedDocumentMarkupPattern =
  /<!doctype\b|<\/?(?:html|head|body|meta|title|style)\b/i;
const fullDocumentVisualPlaceholder =
  '<p class="muted">Documento HTML completo: modifica il sorgente dal tab HTML.</p>';

function normalizeEditorHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "<br>") {
    return "";
  }

  return value;
}

function wrapSelectionWithInlineTag(tagName: "strong") {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);

  if (range.collapsed) {
    return false;
  }

  const wrapper = document.createElement(tagName);
  wrapper.append(range.extractContents());
  range.insertNode(wrapper);
  range.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}

export function SectionBodyEditor({
  availableFigures = [],
  initialValue,
  inputName,
}: SectionBodyEditorProps) {
  const [html, setHtml] = useState(initialValue ?? "");
  const [activeTab, setActiveTab] = useState<"visual" | "html">("visual");
  const [activeFootnoteNumber, setActiveFootnoteNumber] = useState<number | null>(
    null,
  );
  const [isFigurePickerOpen, setIsFigurePickerOpen] = useState(false);
  const [isFootnoteModalOpen, setIsFootnoteModalOpen] = useState(false);
  const [isEditFootnoteModalOpen, setIsEditFootnoteModalOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const savedVisualRangeRef = useRef<Range | null>(null);
  const htmlPanelId = useId();
  const visualPanelId = useId();
  const hasUnsupportedDocumentMarkup = unsupportedDocumentMarkupPattern.test(html);

  useEffect(() => {
    const nextValue = initialValue ?? "";
    setHtml(nextValue);
  }, [initialValue]);

  useEffect(() => {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    const visualHtml = unsupportedDocumentMarkupPattern.test(html)
      ? fullDocumentVisualPlaceholder
      : html;

    if (editorElement.innerHTML !== visualHtml) {
      editorElement.innerHTML = visualHtml;
    }
  }, [html]);

  useEffect(() => {
    if (activeTab !== "visual") {
      setActiveFootnoteNumber(null);
      return;
    }

    setActiveFootnoteNumber(getSelectedFootnoteNumber(editorRef.current));
  }, [activeTab, html]);

  function syncFromEditor() {
    if (hasUnsupportedDocumentMarkup) {
      return;
    }

    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    setHtml(normalizeEditorHtml(editorElement.innerHTML));
  }

  function rememberVisualSelection() {
    const editorElement = editorRef.current;
    const selection = window.getSelection();

    if (!editorElement || !selection || selection.rangeCount === 0) {
      setActiveFootnoteNumber(null);
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editorElement.contains(range.commonAncestorContainer)) {
      setActiveFootnoteNumber(null);
      return;
    }

    savedVisualRangeRef.current = range.cloneRange();
    setActiveFootnoteNumber(getSelectedFootnoteNumber(editorElement));
  }

  function restoreVisualSelection() {
    const selection = window.getSelection();

    if (!selection || !savedVisualRangeRef.current) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(savedVisualRangeRef.current);

    return true;
  }

  function applyToolbarAction(action: ToolbarAction) {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    editorElement.focus();
    restoreVisualSelection();
    const previousHtml = editorElement.innerHTML;
    document.execCommand(action.command, false, action.value);

    if (action.command === "bold" && editorElement.innerHTML === previousHtml) {
      wrapSelectionWithInlineTag("strong");
    }

    syncFromEditor();
    rememberVisualSelection();
  }

  function insertImageSnippet(snippet: string) {
    if (activeTab === "html") {
      const textareaElement = htmlTextareaRef.current;

      if (!textareaElement) {
        setHtml((current) => appendSnippetAtEnd(current, snippet));
        return;
      }

      const start = textareaElement.selectionStart ?? html.length;
      const end = textareaElement.selectionEnd ?? html.length;
      const nextHtml = `${html.slice(0, start)}${snippet}${html.slice(end)}`;

      setHtml(nextHtml);

      window.setTimeout(() => {
        textareaElement.focus();
        const nextCursorPosition = start + snippet.length;
        textareaElement.setSelectionRange(nextCursorPosition, nextCursorPosition);
      }, 0);

      return;
    }

    const editorElement = editorRef.current;

    if (!editorElement) {
      setHtml((current) => appendSnippetAtEnd(current, snippet));
      return;
    }

    editorElement.focus();
    if (restoreVisualSelection()) {
      document.execCommand("insertHTML", false, snippet);
      syncFromEditor();
      rememberVisualSelection();
      return;
    }

    setHtml((current) => appendSnippetAtEnd(current, snippet));
  }

  function insertFootnote(noteText: string) {
    const temporaryFootnoteToken = createTemporaryFootnoteToken();
    const referenceSnippet = buildTemporaryFootnoteReferenceSnippet(
      temporaryFootnoteToken,
    );

    if (activeTab === "html") {
      const textareaElement = htmlTextareaRef.current;
      const insertedHtml = textareaElement
        ? insertSnippetIntoTextareaValue(html, textareaElement, referenceSnippet)
        : appendSnippetAtEnd(html, referenceSnippet);

      const nextHtml = insertFootnoteIntoDocument(
        insertedHtml,
        temporaryFootnoteToken,
        noteText,
      );
      setHtml(nextHtml);

      window.setTimeout(() => {
        textareaElement?.focus();
      }, 0);

      return;
    }

    const editorElement = editorRef.current;

    if (!editorElement) {
      setHtml((current) =>
        insertFootnoteIntoDocument(
          appendSnippetAtEnd(current, referenceSnippet),
          temporaryFootnoteToken,
          noteText,
        ),
      );
      return;
    }

    editorElement.focus();

    let nextVisualHtml = html;

    if (restoreVisualSelection()) {
      document.execCommand("insertHTML", false, referenceSnippet);
      nextVisualHtml = normalizeEditorHtml(editorElement.innerHTML);
    } else {
      nextVisualHtml = appendSnippetAtEnd(html, referenceSnippet);
    }

    setHtml(
      insertFootnoteIntoDocument(nextVisualHtml, temporaryFootnoteToken, noteText),
    );
  }

  function updateFootnote(noteText: string) {
    if (!activeFootnoteNumber) {
      return;
    }

    setHtml((current) =>
      updateFootnoteInDocument(current, activeFootnoteNumber, noteText),
    );
    setIsEditFootnoteModalOpen(false);
  }

  function removeFootnote() {
    if (!activeFootnoteNumber) {
      return;
    }

    if (
      !window.confirm(
        `Vuoi rimuovere la nota ${activeFootnoteNumber} e rinumerare le successive?`,
      )
    ) {
      return;
    }

    setHtml((current) => removeFootnoteFromDocument(current, activeFootnoteNumber));
    setActiveFootnoteNumber(null);
  }

  const activeFootnoteText = activeFootnoteNumber
    ? getFootnoteText(html, activeFootnoteNumber)
    : "";

  return (
    <div className="field">
      <span>Contenuto sezione</span>
      <input name={inputName} type="hidden" value={html} />
      <p className="field-hint">
        Per inserire immagini, caricale prima nella{" "}
        <Link href="/admin/figures" rel="noreferrer" target="_blank">
          libreria figure
        </Link>{" "}
        e poi copia l&apos;URL pubblico o lo snippet HTML.
      </p>

      <div className="section-body-editor-shell">
        <div className="tab-nav section-body-editor-tabs" role="tablist" aria-label="Modalita editor">
          <button
            aria-controls={visualPanelId}
            aria-selected={activeTab === "visual"}
            className={`tab-link${activeTab === "visual" ? " tab-link-active" : ""}`}
            onClick={() => setActiveTab("visual")}
            role="tab"
            type="button"
          >
            WYSIWYG
          </button>
          <button
            aria-controls={htmlPanelId}
            aria-selected={activeTab === "html"}
            className={`tab-link${activeTab === "html" ? " tab-link-active" : ""}`}
            onClick={() => setActiveTab("html")}
            role="tab"
            type="button"
          >
            HTML
          </button>
        </div>

        <div className="wysiwyg-toolbar" role="toolbar" aria-label="Strumenti editor">
          {activeTab === "visual"
            ? toolbarActions.map((action) => (
                <button
                  className="secondary-button small-button"
                  key={`${action.command}-${action.label}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    rememberVisualSelection();
                  }}
                  onClick={() => applyToolbarAction(action)}
                  type="button"
                >
                  {action.label}
                </button>
              ))
            : null}
          <button
            className="primary-button small-button"
            onMouseDown={(event) => {
              event.preventDefault();
              rememberVisualSelection();
            }}
            onClick={() => setIsFigurePickerOpen(true)}
            type="button"
          >
            Inserisci immagine
          </button>
          <button
            className="secondary-button small-button"
            onMouseDown={(event) => {
              event.preventDefault();
              rememberVisualSelection();
            }}
            onClick={() => setIsFootnoteModalOpen(true)}
            type="button"
          >
            Inserisci nota
          </button>
          {activeTab === "visual" ? (
            <>
              <button
                className="secondary-button small-button"
                disabled={!activeFootnoteNumber}
                onMouseDown={(event) => {
                  event.preventDefault();
                  rememberVisualSelection();
                }}
                onClick={() => setIsEditFootnoteModalOpen(true)}
                type="button"
              >
                Modifica nota
              </button>
              <button
                className="secondary-button small-button destructive-button"
                disabled={!activeFootnoteNumber}
                onMouseDown={(event) => {
                  event.preventDefault();
                  rememberVisualSelection();
                }}
                onClick={removeFootnote}
                type="button"
              >
                Rimuovi nota
              </button>
            </>
          ) : null}
        </div>

        <div className="section-body-editor-panel">
          <label
            className={`field section-body-editor-tab-panel${
              activeTab === "html" ? "" : " section-body-editor-tab-panel-hidden"
            }`}
            htmlFor={htmlPanelId}
          >
            <span>HTML</span>
            <textarea
              id={htmlPanelId}
              ref={htmlTextareaRef}
              onChange={(event) => setHtml(event.target.value)}
              placeholder="<p>Testo della sezione...</p>"
              rows={16}
              value={html}
            />
            {hasUnsupportedDocumentMarkup ? (
              <p className="form-warning">
                Hai inserito un documento HTML completo. Il sorgente viene
                salvato integralmente; anteprime e viste esperto usano una
                versione sicura del contenuto del body.
              </p>
            ) : null}
            <p className="field-hint">
              Modifica direttamente il markup HTML che verra&apos; salvato.
            </p>
          </label>

          <div
            className={`field section-body-editor-tab-panel${
              activeTab === "visual" ? "" : " section-body-editor-tab-panel-hidden"
            }`}
          >
            <span id={visualPanelId}>WYSIWYG</span>
            <div
              aria-labelledby={visualPanelId}
              className="wysiwyg-editor"
              contentEditable
              onBlur={syncFromEditor}
              onInput={syncFromEditor}
              onKeyUp={rememberVisualSelection}
              onMouseUp={rememberVisualSelection}
              ref={editorRef}
              suppressContentEditableWarning
            />
            <p className="field-hint">
              Vista visuale sempre sincronizzata con l&apos;HTML. Puoi scrivere, incollare
              testo e usare i comandi base sopra.
            </p>
          </div>
        </div>
      </div>

      {isFigurePickerOpen ? (
        <InsertFigureModal
          availableFigures={availableFigures}
          onClose={() => setIsFigurePickerOpen(false)}
          onInsert={(snippet) => {
            insertImageSnippet(snippet);
            setIsFigurePickerOpen(false);
          }}
        />
      ) : null}

      {isFootnoteModalOpen ? (
        <FootnoteModal
          actionLabel="Inserisci nota"
          initialValue=""
          onClose={() => setIsFootnoteModalOpen(false)}
          onInsert={(noteText) => {
            insertFootnote(noteText);
            setIsFootnoteModalOpen(false);
          }}
          title="Inserisci nota"
        />
      ) : null}

      {isEditFootnoteModalOpen && activeFootnoteNumber ? (
        <FootnoteModal
          actionLabel="Salva nota"
          initialValue={activeFootnoteText}
          onClose={() => setIsEditFootnoteModalOpen(false)}
          onInsert={updateFootnote}
          title={`Modifica nota ${activeFootnoteNumber}`}
        />
      ) : null}
    </div>
  );
}

function InsertFigureModal({
  availableFigures,
  onClose,
  onInsert,
}: {
  availableFigures: StoredFigureEntry[];
  onClose: () => void;
  onInsert: (snippet: string) => void;
}) {
  const [selectedFigurePath, setSelectedFigurePath] = useState(
    availableFigures[0]?.path ?? "",
  );
  const [altText, setAltText] = useState("Descrizione figura");
  const [captionText, setCaptionText] = useState("Didascalia figura.");

  const selectedFigure =
    availableFigures.find((figure) => figure.path === selectedFigurePath) ?? null;

  useEffect(() => {
    if (!selectedFigure) {
      return;
    }

    const baseName = selectedFigure.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const normalizedLabel = baseName.charAt(0).toUpperCase() + baseName.slice(1);

    setAltText(`Figura: ${normalizedLabel}`);
    setCaptionText(normalizedLabel);
  }, [selectedFigure]);

  return (
    <div
      aria-labelledby="insert-figure-title"
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
            <span className="eyebrow">Figure</span>
            <h3 id="insert-figure-title">Inserisci immagine</h3>
          </div>
          <button
            aria-label="Chiudi inserimento immagine"
            className="secondary-button small-button"
            onClick={onClose}
            type="button"
          >
            Chiudi
          </button>
        </div>

        {availableFigures.length === 0 ? (
          <div className="empty-figure-picker">
            <p className="muted">
              Non ci sono ancora figure disponibili. Caricane una prima dalla{" "}
              <Link href="/admin/figures" rel="noreferrer" target="_blank">
                libreria figure
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="figure-picker-layout">
            <div className="figure-picker-list">
              {availableFigures.map((figure) => {
                const isSelected = figure.path === selectedFigurePath;

                return (
                  <button
                    className={`figure-picker-item${isSelected ? " figure-picker-item-selected" : ""}`}
                    key={figure.path}
                    onClick={() => setSelectedFigurePath(figure.path)}
                    type="button"
                  >
                    <img alt={figure.name} src={figure.public_url} />
                    <span>{figure.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="figure-picker-preview">
              {selectedFigure ? (
                <>
                  <div className="figure-picker-preview-image">
                    <img alt={selectedFigure.name} src={selectedFigure.public_url} />
                  </div>

                  <div className="two-column-grid">
                    <label className="field">
                      <span>Testo alternativo</span>
                      <input
                        onChange={(event) => setAltText(event.target.value)}
                        type="text"
                        value={altText}
                      />
                    </label>

                    <label className="field">
                      <span>Didascalia</span>
                      <input
                        onChange={(event) => setCaptionText(event.target.value)}
                        type="text"
                        value={captionText}
                      />
                    </label>
                  </div>

                  <p className="field-hint">
                    L&apos;immagine verra&apos; inserita in formato responsive: non superera&apos;
                    mai la larghezza disponibile e, se piu&apos; piccola, restera&apos; centrata.
                  </p>

                  <div className="compact-form-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        onInsert(
                          buildFigureHtmlSnippetWithContent(
                            selectedFigure.public_url,
                            altText,
                            captionText,
                          ),
                        )
                      }
                      type="button"
                    >
                      Inserisci nell&apos;editor
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function appendSnippetAtEnd(currentHtml: string, snippet: string) {
  const trimmed = currentHtml.trim();

  if (!trimmed) {
    return snippet;
  }

  return `${currentHtml}\n${snippet}`;
}

function createTemporaryFootnoteToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildTemporaryFootnoteReferenceSnippet(temporaryFootnoteToken: string) {
  return `<sup data-footnote-temp="${temporaryFootnoteToken}"><a href="#fn-temp-${temporaryFootnoteToken}" id="ref-temp-${temporaryFootnoteToken}">*</a></sup>`;
}

function insertFootnoteIntoDocument(
  currentHtml: string,
  temporaryFootnoteToken: string,
  noteText: string,
) {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(currentHtml || "", "text/html");
  const rootContainer = getFootnoteContainer(documentFragment.body);
  const notesSection = ensureNotesSection(rootContainer, documentFragment);
  let noteList = notesSection.querySelector("ol");

  if (!noteList) {
    noteList = documentFragment.createElement("ol");
    notesSection.append(noteList);
  }

  const noteItem = documentFragment.createElement("li");
  noteItem.id = `fn-temp-${temporaryFootnoteToken}`;
  noteItem.append(documentFragment.createTextNode(noteText.trim()));
  noteItem.append(documentFragment.createTextNode(" "));

  const backLink = documentFragment.createElement("a");
  backLink.href = `#ref-temp-${temporaryFootnoteToken}`;
  backLink.textContent = "↩";
  noteItem.append(backLink);

  const referenceAnchors = getDocumentFootnoteReferences(rootContainer, notesSection);
  const insertionIndex = referenceAnchors.findIndex(
    (referenceAnchor) => referenceAnchor.id === `ref-temp-${temporaryFootnoteToken}`,
  );
  const directNoteItems = [...noteList.querySelectorAll(":scope > li")];

  if (insertionIndex >= 0 && insertionIndex < directNoteItems.length) {
    noteList.insertBefore(noteItem, directNoteItems[insertionIndex] ?? null);
  } else {
    noteList.append(noteItem);
  }

  renumberFootnotes(rootContainer, notesSection);

  return documentFragment.body.innerHTML;
}

function getFootnoteContainer(body: HTMLElement) {
  const hasSingleSectionRoot =
    body.childElementCount === 1 && body.firstElementChild?.tagName === "SECTION";

  if (hasSingleSectionRoot) {
    return body.firstElementChild as HTMLElement;
  }

  return body;
}

function ensureNotesSection(rootContainer: HTMLElement, documentFragment: Document) {
  const existingNotesSection = rootContainer.querySelector("section[aria-label='Note']");

  if (existingNotesSection instanceof HTMLElement) {
    return existingNotesSection;
  }

  const notesSection = documentFragment.createElement("section");
  notesSection.setAttribute("aria-label", "Note");

  const heading = documentFragment.createElement("h2");
  heading.textContent = "Note";
  notesSection.append(heading);

  const noteList = documentFragment.createElement("ol");
  notesSection.append(noteList);

  const separator = documentFragment.createElement("hr");
  rootContainer.append(separator);
  rootContainer.append(notesSection);

  return notesSection;
}

function getDocumentFootnoteReferences(
  rootContainer: HTMLElement,
  notesSection: HTMLElement,
) {
  return [...rootContainer.querySelectorAll("a[id^='ref'], a[href^='#fn']")].filter(
    (referenceAnchor): referenceAnchor is HTMLAnchorElement =>
      referenceAnchor instanceof HTMLAnchorElement &&
      !notesSection.contains(referenceAnchor),
  );
}

function renumberFootnotes(rootContainer: HTMLElement, notesSection: HTMLElement) {
  const referenceAnchors = getDocumentFootnoteReferences(rootContainer, notesSection).map(
    (referenceAnchor) =>
      normalizeFootnoteReferenceAnchor(referenceAnchor, rootContainer.ownerDocument),
  );
  const noteList = notesSection.querySelector("ol");

  if (!(noteList instanceof HTMLOListElement)) {
    return;
  }

  const noteItems = [...noteList.querySelectorAll(":scope > li")].filter(
    (noteItem): noteItem is HTMLLIElement => noteItem instanceof HTMLLIElement,
  );

  referenceAnchors.forEach((referenceAnchor, index) => {
    const footnoteNumber = index + 1;
    referenceAnchor.id = `ref${footnoteNumber}`;
    referenceAnchor.href = `#fn${footnoteNumber}`;
    referenceAnchor.textContent = String(footnoteNumber);

    const supElement = referenceAnchor.closest("sup");

    if (supElement instanceof HTMLElement) {
      supElement.removeAttribute("data-footnote-temp");
      supElement.removeAttribute("style");
    }

    referenceAnchor.removeAttribute("style");
  });

  noteItems.forEach((noteItem, index) => {
    const footnoteNumber = index + 1;
    noteItem.id = `fn${footnoteNumber}`;

    const existingBackLink = [...noteItem.querySelectorAll("a[href^='#ref']")].findLast(
      (anchor): anchor is HTMLAnchorElement => anchor instanceof HTMLAnchorElement,
    );

    if (existingBackLink) {
      existingBackLink.href = `#ref${footnoteNumber}`;
      existingBackLink.textContent = "↩";
      return;
    }

    noteItem.append(document.createTextNode(" "));
    const backLink = document.createElement("a");
    backLink.href = `#ref${footnoteNumber}`;
    backLink.textContent = "↩";
    noteItem.append(backLink);
  });
}

function normalizeFootnoteReferenceAnchor(
  referenceAnchor: HTMLAnchorElement,
  documentFragment: Document,
) {
  const existingSupElement = referenceAnchor.closest("sup");

  if (existingSupElement instanceof HTMLElement) {
    existingSupElement.removeAttribute("style");
    referenceAnchor.removeAttribute("style");
    return referenceAnchor;
  }

  const supElement = documentFragment.createElement("sup");
  const clonedAnchor = referenceAnchor.cloneNode(true);

  if (!(clonedAnchor instanceof HTMLAnchorElement)) {
    return referenceAnchor;
  }

  clonedAnchor.removeAttribute("style");
  supElement.append(clonedAnchor);
  referenceAnchor.replaceWith(supElement);

  return clonedAnchor;
}

function insertSnippetIntoTextareaValue(
  currentHtml: string,
  textareaElement: HTMLTextAreaElement,
  snippet: string,
) {
  const start = textareaElement.selectionStart ?? currentHtml.length;
  const end = textareaElement.selectionEnd ?? currentHtml.length;

  return `${currentHtml.slice(0, start)}${snippet}${currentHtml.slice(end)}`;
}

function FootnoteModal({
  actionLabel,
  initialValue,
  onClose,
  onInsert,
  title,
}: {
  actionLabel: string;
  initialValue: string;
  onClose: () => void;
  onInsert: (noteText: string) => void;
  title: string;
}) {
  const [noteText, setNoteText] = useState(initialValue);

  useEffect(() => {
    setNoteText(initialValue);
  }, [initialValue]);

  return (
    <div
      aria-labelledby="insert-footnote-title"
      aria-modal="true"
      className="modal-backdrop modal-backdrop-top"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-card modal-card-wide"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card-header">
          <div>
            <span className="eyebrow">Note</span>
            <h3 id="insert-footnote-title">{title}</h3>
          </div>
          <button
            aria-label="Chiudi inserimento nota"
            className="secondary-button small-button"
            onClick={onClose}
            type="button"
          >
            Chiudi
          </button>
        </div>

        <label className="field">
          <span>Contenuto nota</span>
          <textarea
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Scrivi il testo della nota a pie' di pagina..."
            rows={6}
            value={noteText}
          />
          <p className="field-hint">
            L&apos;editor inserira&apos; automaticamente il richiamo nel testo e aggiornera&apos;
            la sezione finale delle note, anche se ne esistono gia&apos; altre.
          </p>
        </label>

        <div className="compact-form-actions">
          <button
            className="primary-button"
            disabled={!noteText.trim()}
            onClick={() => onInsert(noteText)}
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getSelectedFootnoteNumber(editorElement: HTMLDivElement | null) {
  const selection = window.getSelection();

  if (!editorElement || !selection || selection.rangeCount === 0) {
    return null;
  }

  const anchorNode = selection.anchorNode;
  const baseElement =
    anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement ?? null;

  if (!baseElement || !editorElement.contains(baseElement)) {
    return null;
  }

  const referenceAnchor = baseElement.closest("a[id^='ref'], a[href^='#fn']");

  if (referenceAnchor instanceof HTMLAnchorElement) {
    return (
      parseFootnoteNumber(referenceAnchor.id, "ref") ??
      parseFootnoteNumber(referenceAnchor.getAttribute("href"), "#fn")
    );
  }

  const noteItem = baseElement.closest("li[id^='fn']");

  if (noteItem instanceof HTMLLIElement) {
    return parseFootnoteNumber(noteItem.id, "fn");
  }

  const backLink = baseElement.closest("a[href^='#ref']");

  if (backLink instanceof HTMLAnchorElement) {
    return parseFootnoteNumber(backLink.getAttribute("href"), "#ref");
  }

  return null;
}

function parseFootnoteNumber(value: string | null, prefix: string) {
  if (!value?.startsWith(prefix)) {
    return null;
  }

  const parsedValue = Number.parseInt(value.slice(prefix.length), 10);

  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function getFootnoteText(currentHtml: string, footnoteNumber: number) {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(currentHtml || "", "text/html");
  const noteItem = documentFragment.querySelector(
    `li#fn${footnoteNumber}`,
  );

  if (!(noteItem instanceof HTMLLIElement)) {
    return "";
  }

  const noteClone = noteItem.cloneNode(true);

  if (!(noteClone instanceof HTMLLIElement)) {
    return "";
  }

  noteClone
    .querySelectorAll("a[href^='#ref']")
    .forEach((anchor) => anchor.remove());

  return noteClone.textContent?.trim() ?? "";
}

function updateFootnoteInDocument(
  currentHtml: string,
  footnoteNumber: number,
  noteText: string,
) {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(currentHtml || "", "text/html");
  const noteItem = documentFragment.querySelector(`li#fn${footnoteNumber}`);

  if (!(noteItem instanceof HTMLLIElement)) {
    return currentHtml;
  }

  noteItem.textContent = "";
  noteItem.append(documentFragment.createTextNode(noteText.trim()));
  noteItem.append(documentFragment.createTextNode(" "));

  const backLink = documentFragment.createElement("a");
  backLink.href = `#ref${footnoteNumber}`;
  backLink.textContent = "↩";
  noteItem.append(backLink);

  return documentFragment.body.innerHTML;
}

function removeFootnoteFromDocument(currentHtml: string, footnoteNumber: number) {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(currentHtml || "", "text/html");
  const rootContainer = getFootnoteContainer(documentFragment.body);
  const notesSection = rootContainer.querySelector("section[aria-label='Note']");

  rootContainer
    .querySelectorAll(`a#ref${footnoteNumber}, a[href='#fn${footnoteNumber}']`)
    .forEach((referenceAnchor) => {
      const supElement = referenceAnchor.closest("sup");

      if (supElement instanceof HTMLElement) {
        supElement.remove();
        return;
      }

      referenceAnchor.remove();
    });

  const noteItem = rootContainer.querySelector(`li#fn${footnoteNumber}`);
  noteItem?.remove();

  if (notesSection instanceof HTMLElement) {
    const remainingNotes = notesSection.querySelectorAll("ol > li");

    if (remainingNotes.length === 0) {
      const previousElement = notesSection.previousElementSibling;

      if (previousElement?.tagName === "HR") {
        previousElement.remove();
      }

      notesSection.remove();
      return documentFragment.body.innerHTML;
    }

    renumberFootnotes(rootContainer, notesSection);
  }

  return documentFragment.body.innerHTML;
}
