import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  formatConsultationStateLabel,
} from "@/features/admin/consultations/shared";
import { ExpertConsultationReview } from "@/features/expert/consultations/expert-consultation-review";
import {
  getExpertAssignedConsultationById,
  getExpertConsultationSections,
  getExpertSectionComments,
} from "@/features/expert/consultations/queries";
import {
  canExpertSubmitSectionComments,
  getExpertConsultationPageContent,
  getExpertConsultationView,
} from "@/features/expert/consultations/shared";
import { requireExpertProfile } from "@/lib/auth/guards";

type ExpertConsultationPageProps = {
  params: Promise<{
    consultationId: string;
  }>;
};

export default async function ExpertConsultationPage({
  params,
}: ExpertConsultationPageProps) {
  const profile = await requireExpertProfile();
  const { consultationId } = await params;
  const consultation = await getExpertAssignedConsultationById(profile.id, consultationId);

  if (!consultation) {
    notFound();
  }

  if (getExpertConsultationView(consultation.current_state) === "locked") {
    redirect("/app");
  }

  const pageContent = getExpertConsultationPageContent(consultation);
  const consultationView = getExpertConsultationView(consultation.current_state);
  const [sections, comments] =
    consultationView === "phase_1"
      ? await Promise.all([
        getExpertConsultationSections(consultation.id),
        getExpertSectionComments(profile.id, consultation.id),
      ])
      : [[], []];

  return (
    <div className="stack">
      <section className="panel-card panel-card-wide">
        <div className="consultation-detail-panel-header">
          <div className="section-heading">
            <span className="eyebrow">{pageContent.eyebrow}</span>
            <div className="section-heading-copy">
              <h2>{consultation.title}</h2>
              <p>
                Stato attuale: <strong>{formatConsultationStateLabel(consultation.current_state)}</strong>
                {" "}· Documento:{" "}
                <strong>{consultation.document_title || "non ancora definito"}</strong>
              </p>
            </div>
          </div>

          <div className="consultation-detail-panel-actions">
            <Link className="secondary-button small-button" href="/app">
              Torna all&apos;elenco consultazioni
            </Link>
          </div>
        </div>
      </section>

      <section className="panel-card panel-card-wide">
        <div className="section-heading">
          <span className="eyebrow">{pageContent.eyebrow}</span>
          <div className="section-heading-copy">
            <h2>{pageContent.title}</h2>
            <p>{pageContent.body}</p>
          </div>
        </div>

        {consultation.description ? (
          <div className="expert-consultation-detail-block">
            <strong>Descrizione consultazione</strong>
            <p>{consultation.description}</p>
          </div>
        ) : null}

        {consultation.document_description ? (
          <div className="expert-consultation-detail-block">
            <strong>Descrizione documento</strong>
            <p>{consultation.document_description}</p>
          </div>
        ) : null}

        {consultationView === "phase_1" ? (
          <ExpertConsultationReview
            canSubmitComments={canExpertSubmitSectionComments(consultation.current_state)}
            comments={comments}
            consultationId={consultation.id}
            sections={sections}
          />
        ) : (
          <div className="expert-consultation-placeholder">
            <strong>Prossimo step implementativo</strong>
            <p>
              Questa route e&apos; gia&apos; distinta per fase e verra&apos; popolata con
              l&apos;interfaccia reale di commento, voto o risultati finali nel prossimo
              step.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
