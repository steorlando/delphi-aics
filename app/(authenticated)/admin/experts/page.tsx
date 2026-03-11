import { CreateExpertForm } from "@/features/admin/experts/create-expert-form";
import { getExpertsDirectory } from "@/features/admin/experts/queries";
import { ResendInviteButton } from "@/features/admin/experts/resend-invite-button";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminExpertsPage() {
  const experts = await getExpertsDirectory();

  return (
    <div className="stack">
      <CreateExpertForm />

      <section className="panel-card">
        <span className="eyebrow">Elenco</span>
        <h2>Esperti esistenti</h2>
        <p>
          Trovat{experts.length === 1 ? "o" : "i"} {experts.length} account{" "}
          {experts.length === 1 ? "esperto" : "esperti"} nella tabella dei
          profili applicativi.
        </p>

        {experts.length === 0 ? (
          <p className="muted">Non e&apos; stato ancora creato alcun account esperto.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Istituzione</th>
                  <th>Email</th>
                  <th>Stato</th>
                  <th>Creato il</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {experts.map((expert) => (
                  <tr key={expert.id}>
                    <td>
                      {expert.first_name} {expert.last_name}
                    </td>
                    <td>{expert.institution_name || "—"}</td>
                    <td>{expert.email}</td>
                    <td>
                      <div className="status-stack">
                        <span className="status-badge">
                          {expert.is_active ? "Attivo" : "Inattivo"}
                        </span>
                        {expert.must_reset_password ? (
                          <span className="status-badge warning-badge">
                            Cambio password in attesa
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>{formatDate(expert.created_at)}</td>
                    <td>
                      {expert.must_reset_password && expert.is_active ? (
                        <ResendInviteButton profileId={expert.id} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
