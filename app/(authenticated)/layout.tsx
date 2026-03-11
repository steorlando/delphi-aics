import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAuthenticatedProfile } from "@/lib/auth/guards";
import { hasPublicSupabaseEnv } from "@/lib/env";

type AuthenticatedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

function getRoleLabel(role: string) {
  return role === "admin" ? "Amministratore" : "Esperto";
}

export default async function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="Le route protette dipendono dai cookie di Supabase Auth e dalla tabella dei profili. Configura le variabili pubbliche di Supabase prima di testare quest'area."
        title="Supabase non e' ancora configurato"
      />
    );
  }

  const profile = await requireAuthenticatedProfile();

  if (profile.must_reset_password) {
    redirect("/change-password");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-primary">
          <span className="eyebrow">Area autenticata</span>
          <h1 className="app-title">Consultazione Delphi</h1>
        </div>
        <div className="app-header-actions">
          <p className="app-subtitle">
            {profile.first_name} {profile.last_name} · {getRoleLabel(profile.role)}
          </p>
          <SignOutButton />
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
