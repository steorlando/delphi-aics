import { ConsultationsTable } from "@/features/admin/consultations/consultations-table";
import { CreateConsultationForm } from "@/features/admin/consultations/create-consultation-form";
import { getConsultationsDirectory } from "@/features/admin/consultations/queries";

export default async function AdminConsultationsPage() {
  const consultations = await getConsultationsDirectory();

  return (
    <div className="admin-experts-layout">
      <CreateConsultationForm />

      <section className="panel-card panel-card-wide admin-table-column admin-table-panel">
        <div className="section-heading">
          <span className="eyebrow">Elenco</span>
          <div className="section-heading-copy">
            <h2>Consultazioni esistenti</h2>
            <p>
              Trovat{consultations.length === 1 ? "a" : "e"} {consultations.length}{" "}
              {consultations.length === 1 ? "consultazione" : "consultazioni"} nel
              database applicativo.
            </p>
          </div>
        </div>

        {consultations.length === 0 ? (
          <p className="muted">
            Non e&apos; stata ancora creata alcuna consultazione.
          </p>
        ) : (
          <ConsultationsTable consultations={consultations} />
        )}
      </section>
    </div>
  );
}
