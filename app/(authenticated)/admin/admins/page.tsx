import { requireAdminProfile } from "@/lib/auth/guards";
import { AdminsTable } from "@/features/admin/admins/admins-table";
import { CreateAdminForm } from "@/features/admin/admins/create-admin-form";
import { getAdminsDirectory } from "@/features/admin/admins/queries";

export default async function AdminAdminsPage() {
  const profile = await requireAdminProfile();
  const admins = await getAdminsDirectory();

  return (
    <div className="admin-experts-layout">
      <CreateAdminForm />

      <section className="panel-card panel-card-wide admin-table-column admin-table-panel">
        <div className="section-heading">
          <span className="eyebrow">Elenco</span>
          <div className="section-heading-copy">
            <h2>Amministratori esistenti</h2>
            <p>
              Trovat{admins.length === 1 ? "o" : "i"} {admins.length} account{" "}
              {admins.length === 1 ? "amministratore" : "amministratori"} nella
              tabella dei profili applicativi.
            </p>
          </div>
        </div>

        {admins.length === 0 ? (
          <p className="muted">
            Non e&apos; stato ancora creato alcun account amministratore.
          </p>
        ) : (
          <AdminsTable admins={admins} currentAdminProfileId={profile.id} />
        )}
      </section>
    </div>
  );
}
