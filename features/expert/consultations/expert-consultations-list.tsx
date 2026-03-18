import Link from "next/link";
import {
  formatConsultationStateLabel,
} from "@/features/admin/consultations/shared";
import {
  getExpertConsultationCardDescription,
  isExpertConsultationAccessible,
  type ExpertAssignedConsultationEntry,
} from "@/features/expert/consultations/shared";

type ExpertConsultationsListProps = {
  consultations: ExpertAssignedConsultationEntry[];
};

export function ExpertConsultationsList({
  consultations,
}: ExpertConsultationsListProps) {
  return (
    <div className="expert-consultations-grid">
      {consultations.map((consultation) => {
        const isAccessible = isExpertConsultationAccessible(consultation.current_state);
        const content = (
          <>
            <div className="expert-consultation-card-heading">
              <span className="eyebrow">Consultazione</span>
              <div className="section-heading-copy">
                <h2>{consultation.title}</h2>
                <p>{getExpertConsultationCardDescription(consultation)}</p>
              </div>
            </div>

            <div className="expert-consultation-card-meta">
              <span className="expert-consultation-state-badge">
                {formatConsultationStateLabel(consultation.current_state)}
              </span>
              <strong>
                {consultation.document_title || "Documento non ancora definito"}
              </strong>
            </div>
          </>
        );

        if (!isAccessible) {
          return (
            <article
              className="panel-card expert-consultation-card expert-consultation-card-disabled"
              key={consultation.id}
            >
              {content}
            </article>
          );
        }

        return (
          <Link
            className="panel-card expert-consultation-card"
            href={`/app/${consultation.id}`}
            key={consultation.id}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
