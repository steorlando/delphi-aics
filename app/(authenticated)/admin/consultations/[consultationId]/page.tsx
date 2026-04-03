import { notFound } from "next/navigation";
import { AdminConsultationCommentsManager } from "@/features/admin/consultations/admin-consultation-comments-manager";
import { ConsultationDetailPanel } from "@/features/admin/consultations/consultation-detail-panel";
import { ConsultationParticipantsManager } from "@/features/admin/consultations/consultation-participants-manager";
import { CreateDocumentSectionForm } from "@/features/admin/consultations/create-document-section-form";
import { DocumentSectionsList } from "@/features/admin/consultations/document-sections-list";
import {
  type DocumentSectionEntry,
} from "@/features/admin/consultations/shared";
import { getFigureLibraryState } from "@/features/admin/figures/queries";
import { getExpertsDirectory } from "@/features/admin/experts/queries";
import {
  getConsultationById,
  getExpertSectionCommentsByConsultationId,
  getConsultationParticipantsByConsultationId,
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
  const [consultation, sections, figureLibraryState, experts, participants, comments] = await Promise.all([
    getConsultationById(consultationId),
    getDocumentSectionsByConsultationId(consultationId),
    getFigureLibraryState(),
    getExpertsDirectory(),
    getConsultationParticipantsByConsultationId(consultationId),
    getExpertSectionCommentsByConsultationId(consultationId),
  ]);

  if (!consultation) {
    notFound();
  }

  const nextOrderIndex = getNextOrderIndex(sections);

  return (
    <div className="stack">
      <ConsultationDetailPanel
        consultation={consultation}
        participantCount={participants.filter((participant) => participant.is_active).length}
      />

      <ConsultationParticipantsManager
        consultationId={consultation.id}
        experts={experts}
        participants={participants}
      />

      <AdminConsultationCommentsManager
        comments={comments}
        consultationId={consultation.id}
        consultationState={consultation.current_state}
        experts={experts}
        sections={sections}
      />

      <CreateDocumentSectionForm
        availableFigures={figureLibraryState.figures}
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
          <DocumentSectionsList
            availableFigures={figureLibraryState.figures}
            sections={sections}
          />
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
