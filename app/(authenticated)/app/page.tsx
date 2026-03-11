import { requireExpertProfile } from "@/lib/auth/guards";

export default async function ExpertHomePage() {
  const profile = await requireExpertProfile();

  return (
    <section className="panel-card">
      <span className="eyebrow">Area esperto</span>
      <h2>Benvenuto, {profile.first_name}</h2>
      <p>
        Il tuo spazio di consultazione apparira&apos; qui una volta implementato il
        flusso di commento basato sulle sezioni.
      </p>
    </section>
  );
}
