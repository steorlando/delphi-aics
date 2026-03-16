import Link from "next/link";
import { getAdminsDirectory } from "@/features/admin/admins/queries";
import { getConsultationsDirectory } from "@/features/admin/consultations/queries";
import { getExpertsDirectory } from "@/features/admin/experts/queries";

export default async function AdminHomePage() {
  const admins = await getAdminsDirectory();
  const consultations = await getConsultationsDirectory();
  const experts = await getExpertsDirectory();

  return (
    <div className="admin-overview-grid">
      <section className="panel-card">
        <span className="eyebrow">Panoramica</span>
        <h2>Stato iniziale</h2>
        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-value">{admins.length}</span>
            <span className="metric-label">Amministratori attivi nel profilo applicativo</span>
          </article>
          <article className="metric-card">
            <span className="metric-value">{experts.length}</span>
            <span className="metric-label">Esperti creati</span>
          </article>
          <article className="metric-card">
            <span className="metric-value">{consultations.length}</span>
            <span className="metric-label">Consultazioni configurate</span>
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
        <span className="eyebrow">Contenuto</span>
        <h2>Configura consultazioni e sezioni</h2>
        <p>
          Il prossimo flusso operativo parte dalla creazione della consultazione
          e dalla definizione delle sezioni del documento in HTML.
        </p>
        <Link className="primary-link" href="/admin/consultations">
          Apri gestione consultazioni
        </Link>
      </section>

      <section className="panel-card">
        <span className="eyebrow">Gestione accessi</span>
        <h2>Gestisci gli amministratori</h2>
        <p>
          Quando serve aggiungere un nuovo admin, usa una sezione separata per
          creare il profilo e inviare l&apos;invito iniziale senza mescolarlo al
          workflow degli esperti.
        </p>
        <Link className="primary-link" href="/admin/admins">
          Apri gestione amministratori
        </Link>
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
