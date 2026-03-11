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
    <div className="admin-shell">
      <aside className="panel-card admin-sidebar">
        <span className="eyebrow">Spazio amministrativo</span>
        <h2>{profile.first_name} {profile.last_name}</h2>
        <p>
          Seleziona una funzione dal menu e lavora nell&apos;area operativa a destra.
        </p>
        <nav className="admin-sidebar-nav" aria-label="Sezioni amministrative">
          {adminLinks.map((link) => (
            <Link className="admin-sidebar-link" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
