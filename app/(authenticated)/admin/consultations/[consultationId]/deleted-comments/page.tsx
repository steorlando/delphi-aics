import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletedCommentsList } from "@/features/admin/consultations/deleted-comments-list";
import {
  getConsultationById,
  getDocumentSectionsByConsultationId,
  getInactiveExpertSectionCommentsByConsultationId,
} from "@/features/admin/consultations/queries";
import { getExpertsDirectory } from "@/features/admin/experts/queries";

type DeletedCommentsPageProps = {
  params: Promise<{
    consultationId: string;
  }>;
};

export default async function DeletedCommentsPage({
  params,
}: DeletedCommentsPageProps) {
  const { consultationId } = await params;
  const [consultation, comments, experts, sections] = await Promise.all([
    getConsultationById(consultationId),
    getInactiveExpertSectionCommentsByConsultationId(consultationId),
    getExpertsDirectory(),
    getDocumentSectionsByConsultationId(consultationId),
  ]);

  if (!consultation) {
    notFound();
  }

  return (
    <div className="stack">
      <section className="panel-card panel-card-wide">
        <div className="section-heading">
          <span className="eyebrow">Commenti eliminati</span>
          <div className="section-heading-copy">
            <h1>{consultation.title}</h1>
            <p>
              {comments.length === 0
                ? "Non risultano commenti inattivi per questa consultazione."
                : `Sono presenti ${comments.length} ${comments.length === 1 ? "commento eliminato" : "commenti eliminati"} che puoi ripristinare.`}
            </p>
          </div>
        </div>

        <div className="page-actions">
          <Link
            className="secondary-button small-button"
            href={`/admin/consultations/${consultation.id}`}
          >
            Torna alla consultazione
          </Link>
        </div>
      </section>

      <DeletedCommentsList
        comments={comments}
        consultationId={consultation.id}
        experts={experts}
        sections={sections}
      />
    </div>
  );
}
