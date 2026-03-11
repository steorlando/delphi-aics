import Link from "next/link";
import { requireAdminProfile } from "@/lib/auth/guards";

type AdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

const adminLinks = [
  {
    href: "/admin",
    label: "Panoramica",
  },
  {
    href: "/admin/experts",
    label: "Esperti",
  },
];

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireAdminProfile();

  return (
    <div className="stack">
      <section className="panel-card">
        <span className="eyebrow">Spazio amministrativo</span>
        <h2>{profile.first_name} {profile.last_name}</h2>
        <p>
          Gestisci prima l&apos;accesso degli esperti. La configurazione della
          consultazione e la gestione delle sezioni saranno aggiunte nei
          prossimi passaggi di implementazione.
        </p>
        <nav className="tab-nav" aria-label="Sezioni amministrative">
          {adminLinks.map((link) => (
            <Link className="tab-link" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
      {children}
    </div>
  );
}
