import { CreateExpertForm } from "@/features/admin/experts/create-expert-form";
import { ExpertsTable } from "@/features/admin/experts/experts-table";
import { ImportExpertsForm } from "@/features/admin/experts/import-experts-form";
import { getExpertsDirectory } from "@/features/admin/experts/queries";

export default async function AdminExpertsPage() {
  const experts = await getExpertsDirectory();

  return (
    <div className="admin-experts-layout">
      <div className="admin-experts-actions">
        <CreateExpertForm />
        <ImportExpertsForm />
      </div>

      <section className="panel-card panel-card-wide admin-table-column admin-table-panel">
        <div className="section-heading">
          <span className="eyebrow">Elenco</span>
          <div className="section-heading-copy">
            <h2>Esperti esistenti</h2>
            <p>
              Trovat{experts.length === 1 ? "o" : "i"} {experts.length} account{" "}
              {experts.length === 1 ? "esperto" : "esperti"} nella tabella dei
              profili applicativi.
            </p>
          </div>
        </div>

        {experts.length === 0 ? (
          <p className="muted">Non e&apos; stato ancora creato alcun account esperto.</p>
        ) : (
          <ExpertsTable experts={experts} />
        )}
      </section>
    </div>
  );
}
