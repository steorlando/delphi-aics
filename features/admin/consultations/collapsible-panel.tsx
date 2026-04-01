"use client";

import { useEffect, useState } from "react";

type CollapsiblePanelProps = {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

export function CollapsiblePanel({
  eyebrow,
  title,
  description,
  defaultOpen = false,
  forceOpen = false,
  headerActions,
  children,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || forceOpen);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  return (
    <section className="panel-card panel-card-wide collapsible-panel">
      <div className="collapsible-panel-header">
        <button
          aria-expanded={isOpen}
          className="collapsible-panel-trigger"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <div className="collapsible-panel-trigger-copy">
            <span className="eyebrow">{eyebrow}</span>
            <div className="section-heading-copy">
              <h2>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
          </div>
        </button>

        <div className="collapsible-panel-header-actions">
          {headerActions}
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Comprimi pannello" : "Espandi pannello"}
            className="collapsible-panel-trigger-icon"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            {isOpen ? "−" : "+"}
          </button>
        </div>
      </div>

      {isOpen ? <div className="collapsible-panel-body">{children}</div> : null}
    </section>
  );
}
