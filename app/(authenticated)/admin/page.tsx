import Link from "next/link";
import { getExpertsDirectory } from "@/features/admin/experts/queries";

export default async function AdminHomePage() {
  const experts = await getExpertsDirectory();

  return (
    <div className="stack">
      <section className="panel-card">
        <span className="eyebrow">Panoramica</span>
        <h2>Stato iniziale</h2>
        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-value">{experts.length}</span>
            <span className="metric-label">Esperti creati</span>
          </article>
          <article className="metric-card">
            <span className="metric-value">
              {experts.filter((expert) => expert.must_reset_password).length}
            </span>
            <span className="metric-label">Configurazione password iniziale in attesa</span>
          </article>
        </div>
      </section>

      <section className="panel-card">
        <span className="eyebrow">Passo successivo</span>
        <h2>Gestisci l&apos;accesso degli esperti</h2>
        <p>
          L&apos;abilitazione degli esperti e&apos; ora il primo flusso amministrativo
          concreto. Crea gli account, invia le email di invito e verifica che
          gli utenti invitati completino la configurazione della password al primo accesso.
        </p>
        <Link className="primary-link" href="/admin/experts">
          Apri gestione esperti
        </Link>
      </section>
    </div>
  );
}
