import Link from "next/link";

type ConsultationDocumentLinkProps = {
  consultationId: string;
};

export function ConsultationDocumentLink({
  consultationId,
}: ConsultationDocumentLinkProps) {
  return (
    <div className="document-export-action">
      <Link
        className="secondary-button small-button"
        href={`/consultations/${consultationId}/document`}
        rel="noreferrer"
        target="_blank"
      >
        Genera documento unico
      </Link>
      <details className="document-export-info">
        <summary aria-label="Informazioni sul documento unico">i</summary>
        <p>
          Il documento generato si apre nel browser in una nuova finestra pulita.
          Da li&apos; puoi usare il menu del browser per salvarlo in PDF o nel
          formato che preferisci.
        </p>
      </details>
    </div>
  );
}
