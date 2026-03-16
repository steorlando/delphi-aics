"use client";

import { useEffect, useId, useRef, useState } from "react";

type SectionBodyEditorProps = {
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

function normalizeEditorHtml(value: string) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "<br>") {
    return "";
  }

  return value;
}

export function SectionBodyEditor({
  initialValue,
  inputName,
}: SectionBodyEditorProps) {
  const [html, setHtml] = useState(initialValue ?? "");
  const [activeTab, setActiveTab] = useState<"visual" | "html">("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlPanelId = useId();
  const visualPanelId = useId();

  useEffect(() => {
    const nextValue = initialValue ?? "";
    setHtml(nextValue);
  }, [initialValue]);

  useEffect(() => {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    if (editorElement.innerHTML !== html) {
      editorElement.innerHTML = html;
    }
  }, [html]);

  function syncFromEditor() {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    setHtml(normalizeEditorHtml(editorElement.innerHTML));
  }

  function applyToolbarAction(action: ToolbarAction) {
    const editorElement = editorRef.current;

    if (!editorElement) {
      return;
    }

    editorElement.focus();
    document.execCommand(action.command, false, action.value);
    syncFromEditor();
  }

  return (
    <div className="field">
      <span>Contenuto sezione</span>
      <input name={inputName} type="hidden" value={html} />

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

        {activeTab === "visual" ? (
          <div className="wysiwyg-toolbar" role="toolbar" aria-label="Strumenti editor">
            {toolbarActions.map((action) => (
              <button
                className="secondary-button small-button"
                key={`${action.command}-${action.label}`}
                onClick={() => applyToolbarAction(action)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}

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
              onChange={(event) => setHtml(event.target.value)}
              placeholder="<p>Testo della sezione...</p>"
              rows={16}
              value={html}
            />
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
    </div>
  );
}
