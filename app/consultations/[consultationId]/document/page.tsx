import { notFound, redirect } from "next/navigation";
import {
  getConsultationById,
  getDocumentSectionsByConsultationId,
} from "@/features/admin/consultations/queries";
import {
  getExpertAssignedConsultationById,
  getExpertConsultationSections,
} from "@/features/expert/consultations/queries";
import { requireAuthenticatedProfile } from "@/lib/auth/guards";
import { getSanitizedDocumentHtml } from "@/lib/html/sanitize";

type ConsultationDocumentPageProps = {
  params: Promise<{
    consultationId: string;
  }>;
};

export default async function ConsultationDocumentPage({
  params,
}: ConsultationDocumentPageProps) {
  const profile = await requireAuthenticatedProfile();

  if (profile.must_reset_password) {
    redirect("/change-password");
  }

  const { consultationId } = await params;
  const consultation =
    profile.role === "admin"
      ? await getConsultationById(consultationId)
      : await getExpertAssignedConsultationById(profile.id, consultationId);

  if (!consultation) {
    notFound();
  }

  const sectionsQuery =
    profile.role === "admin"
      ? getDocumentSectionsByConsultationId(consultation.id)
      : getExpertConsultationSections(consultation.id);
  const sections = (await sectionsQuery)
    .filter((section) => section.is_active)
    .sort((first, second) => first.order_index - second.order_index);
  const documentTitle = consultation.document_title || consultation.title;
  const documentDescription = consultation.document_description || consultation.description;

  return (
    <main className="print-document-page">
      <article className="print-document">
        <header className="print-document-cover">
          <p className="print-document-kicker">Documento di consultazione</p>
          <h1>{documentTitle}</h1>
          {documentDescription ? <p>{documentDescription}</p> : null}
        </header>

        {sections.map((section) => (
          <section className="print-document-section" key={section.id}>
            <header className="print-document-section-header">
              {section.reference_label ? (
                <p className="print-document-reference">{section.reference_label}</p>
              ) : null}
              <h2>{section.title}</h2>
            </header>
            <div
              className="print-document-content"
              dangerouslySetInnerHTML={{
                __html: getSanitizedDocumentHtml(section.body_text),
              }}
            />
          </section>
        ))}
      </article>
    </main>
  );
}
