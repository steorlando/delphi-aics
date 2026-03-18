import { ExpertConsultationsList } from "@/features/expert/consultations/expert-consultations-list";
import { getExpertAssignedConsultations } from "@/features/expert/consultations/queries";
import { requireExpertProfile } from "@/lib/auth/guards";

export default async function ExpertHomePage() {
  const profile = await requireExpertProfile();
  const consultations = await getExpertAssignedConsultations(profile.id);

  return (
    <section className="panel-card panel-card-wide">
      <div className="section-heading">
        <span className="eyebrow">Area esperto</span>
        <div className="section-heading-copy">
          <h2>Consultazioni assegnate</h2>
          <p>
            {consultations.length === 0
              ? `${profile.first_name}, non hai ancora consultazioni assegnate.`
              : `Ciao ${profile.first_name}, trovi qui le consultazioni a cui sei stato assegnato.`}
          </p>
        </div>
      </div>

      {consultations.length === 0 ? (
        <p className="muted">
          Quando un amministratore ti assegnera&apos; una consultazione, comparira&apos; in
          questo elenco con il relativo stato.
        </p>
      ) : (
        <ExpertConsultationsList consultations={consultations} />
      )}
    </section>
  );
}
