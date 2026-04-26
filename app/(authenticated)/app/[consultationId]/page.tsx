import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  formatConsultationStateLabel,
} from "@/features/admin/consultations/shared";
import { ExpertConsultationPhase2Voting } from "@/features/expert/consultations/expert-consultation-phase-2-voting";
import { ExpertConsultationReview } from "@/features/expert/consultations/expert-consultation-review";
import {
  getExpertAssignedConsultationById,
  getExpertPhase2VotableComments,
  getExpertConsultationSections,
  getExpertSectionComments,
} from "@/features/expert/consultations/queries";
import {
  canExpertSubmitSectionComments,
  canExpertVotePhase2,
  getExpertConsultationPageContent,
  getExpertConsultationView,
  type ExpertConsultationSectionEntry,
  type ExpertPhase2VotableCommentEntry,
  type ExpertSectionCommentEntry,
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
  let sections: ExpertConsultationSectionEntry[] = [];
  let comments: ExpertSectionCommentEntry[] = [];
  let phase2VotableComments: ExpertPhase2VotableCommentEntry[] = [];

  if (consultationView === "phase_1") {
    [sections, comments] = await Promise.all([
      getExpertConsultationSections(consultation.id),
      getExpertSectionComments(profile.id, consultation.id),
    ]);
  }

  if (consultationView === "phase_2") {
    [sections, phase2VotableComments] = await Promise.all([
      getExpertConsultationSections(consultation.id),
      getExpertPhase2VotableComments(profile.id, consultation.id),
    ]);
  }

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

        {consultationView === "phase_2" ? (
          <div className="expert-consultation-detail-block">
            <strong>Istruzioni per la votazione</strong>
            <p>
              In questa fase trovi, per ciascuna sezione del documento, i commenti
              consolidati da valutare. La pagina si apre sulla prima sezione, ma puoi
              usare la barra laterale sinistra per passare rapidamente alle altre
              sezioni e leggere i commenti pubblicati per ognuna.
            </p>
            <p>
              Per ogni commento indica il tuo livello di accordo scegliendo un valore
              da <strong>0</strong> a <strong>4</strong>.
            </p>
            <ul className="expert-review-document-content">
              <li><strong>0</strong>: Non sono d&apos;accordo</li>
              <li><strong>1</strong>: Parzialmente in disaccordo</li>
              <li><strong>2</strong>: Neutro</li>
              <li><strong>3</strong>: Parzialmente d&apos;accordo</li>
              <li><strong>4</strong>: D&apos;accordo</li>
            </ul>
            <p>
              Puoi selezionare o aggiornare il voto direttamente su ciascun commento
              finche&apos; la consultazione resta aperta. Se vuoi, puoi aggiungere anche
              un commento anonimo visibile agli amministratori.
            </p>
          </div>
        ) : null}

        {consultationView !== "phase_2" && consultation.document_description ? (
          <div className="expert-consultation-detail-block">
            <strong>Descrizione documento</strong>
            <p>{consultation.document_description}</p>
          </div>
        ) : null}

        {consultationView !== "phase_2" && consultation.description ? (
          <div className="expert-consultation-detail-block">
            <strong>Istruzioni per questa fase</strong>
            <p>{consultation.description}</p>
          </div>
        ) : null}

        {consultationView === "phase_1" ? (
          <ExpertConsultationReview
            canSubmitComments={canExpertSubmitSectionComments(consultation.current_state)}
            comments={comments}
            consultationId={consultation.id}
            sections={sections}
          />
        ) : consultationView === "phase_2" ? (
          <ExpertConsultationPhase2Voting
            canSubmitVotes={canExpertVotePhase2(consultation.current_state)}
            consultationId={consultation.id}
            sections={sections}
            votableComments={phase2VotableComments}
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
