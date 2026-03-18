"use client";

import Link from "next/link";
import { useState } from "react";
import { ConsultationSettingsForm } from "@/features/admin/consultations/consultation-settings-form";
import {
  formatConsultationStateLabel,
  type ConsultationDirectoryEntry,
} from "@/features/admin/consultations/shared";

type ConsultationDetailPanelProps = {
  consultation: ConsultationDirectoryEntry;
  participantCount: number;
};

export function ConsultationDetailPanel({
  consultation,
  participantCount,
}: ConsultationDetailPanelProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <section className="panel-card panel-card-wide consultation-detail-panel">
      <div className="consultation-detail-panel-header">
        <div className="section-heading">
          <span className="eyebrow">Dettaglio consultazione</span>
          <div className="section-heading-copy">
            <h2>{consultation.title}</h2>
            <p>
              Stato attuale:{" "}
              <strong>{formatConsultationStateLabel(consultation.current_state)}</strong>
              {" "}· Esperti assegnati: <strong>{participantCount}</strong>
              {" "}· Documento:{" "}
              <strong>{consultation.document_title || "non ancora definito"}</strong>
            </p>
          </div>
        </div>

        <div className="consultation-detail-panel-actions">
          <Link className="secondary-button small-button" href="/admin/consultations">
            Torna all&apos;elenco consultazioni
          </Link>
          <button
            aria-expanded={isSettingsOpen}
            aria-label={
              isSettingsOpen
                ? "Chiudi configurazione consultazione"
                : "Apri configurazione consultazione"
            }
            className="consultation-detail-panel-toggle"
            onClick={() => setIsSettingsOpen((current) => !current)}
            type="button"
          >
            {isSettingsOpen ? "−" : "+"}
          </button>
        </div>
      </div>

      {isSettingsOpen ? (
        <ConsultationSettingsForm
          consultation={consultation}
          embedded
          participantCount={participantCount}
        />
      ) : null}
    </section>
  );
}
