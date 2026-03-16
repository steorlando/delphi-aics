import { AdminShell } from "@/components/admin-shell";
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
    href: "/admin/consultations",
    label: "Consultazioni",
  },
  {
    href: "/admin/admins",
    label: "Amministratori",
  },
  {
    href: "/admin/experts",
    label: "Esperti",
  },
];

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireAdminProfile();

  return (
    <AdminShell
      adminLinks={adminLinks}
      fullName={`${profile.first_name} ${profile.last_name}`}
    >
      {children}
    </AdminShell>
  );
}
