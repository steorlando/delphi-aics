"use client";

import { useEffect, useState } from "react";

type CollapsiblePanelProps = {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
};

export function CollapsiblePanel({
  eyebrow,
  title,
  description,
  defaultOpen = false,
  forceOpen = false,
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
        <span aria-hidden="true" className="collapsible-panel-trigger-icon">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen ? <div className="collapsible-panel-body">{children}</div> : null}
    </section>
  );
}
