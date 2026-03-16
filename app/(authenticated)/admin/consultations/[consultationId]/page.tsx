import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsultationSettingsForm } from "@/features/admin/consultations/consultation-settings-form";
import { CreateDocumentSectionForm } from "@/features/admin/consultations/create-document-section-form";
import { DocumentSectionsList } from "@/features/admin/consultations/document-sections-list";
import {
  formatConsultationStateLabel,
  type DocumentSectionEntry,
} from "@/features/admin/consultations/shared";
import {
  getConsultationById,
  getDocumentSectionsByConsultationId,
} from "@/features/admin/consultations/queries";

type AdminConsultationDetailPageProps = {
  params: Promise<{
    consultationId: string;
  }>;
};

export default async function AdminConsultationDetailPage({
  params,
}: AdminConsultationDetailPageProps) {
  const { consultationId } = await params;
  const [consultation, sections] = await Promise.all([
    getConsultationById(consultationId),
    getDocumentSectionsByConsultationId(consultationId),
  ]);

  if (!consultation) {
    notFound();
  }

  const nextOrderIndex = getNextOrderIndex(sections);

  return (
    <div className="stack">
      <div className="consultation-detail-row">
        <section className="panel-card panel-card-wide">
          <span className="eyebrow">Dettaglio consultazione</span>
          <h2>{consultation.title}</h2>
          <p>
            Stato attuale: <strong>{formatConsultationStateLabel(consultation.current_state)}</strong>
            {" "}· Documento: <strong>{consultation.document_title || "non ancora definito"}</strong>
          </p>
          <div className="compact-form-actions">
            <Link className="secondary-button" href="/admin/consultations">
              Torna all&apos;elenco consultazioni
            </Link>
          </div>
        </section>

        <ConsultationSettingsForm consultation={consultation} />
      </div>

      <CreateDocumentSectionForm
        consultationId={consultation.id}
        nextOrderIndex={nextOrderIndex}
      />

      <section className="panel-card panel-card-wide">
        <div className="section-heading">
          <span className="eyebrow">Struttura documento</span>
          <div className="section-heading-copy">
            <h2>Sezioni configurate</h2>
            <p>
              {sections.length === 0
                ? "Non ci sono ancora sezioni."
                : `Sono presenti ${sections.length} ${sections.length === 1 ? "sezione" : "sezioni"} per questa consultazione.`}
            </p>
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="muted">
            Aggiungi la prima sezione per iniziare a costruire il documento da
            sottoporre agli esperti.
          </p>
        ) : (
          <DocumentSectionsList sections={sections} />
        )}
      </section>
    </div>
  );
}

function getNextOrderIndex(sections: DocumentSectionEntry[]) {
  if (sections.length === 0) {
    return 1;
  }

  return Math.max(...sections.map((section) => section.order_index)) + 1;
}
