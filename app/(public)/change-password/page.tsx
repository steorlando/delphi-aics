import { redirect } from "next/navigation";
import { AicsLogo } from "@/components/aics-logo";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getRoleHome } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { ChangePasswordForm } from "./change-password-form";

type ChangePasswordPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function ChangePasswordPage({
  searchParams,
}: ChangePasswordPageProps) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="Il flusso di reimpostazione della password dipende da Supabase Auth e dalla tabella dei profili applicativi."
        title="Supabase non e' ancora configurato"
      />
    );
  }

  const { user, profile } = await getAuthContext();
  const { mode } = await searchParams;
  const isRecoveryMode = mode === "recovery";

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.is_active) {
    redirect("/login?error=profile_missing");
  }

  if (!profile.must_reset_password && !isRecoveryMode) {
    redirect(getRoleHome(profile.role));
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <AicsLogo className="auth-brand" />
        <span className="eyebrow">
          {isRecoveryMode ? "Recupero password" : "Primo accesso"}
        </span>
        <h1>
          {isRecoveryMode
            ? "Reimposta la tua password"
            : "Imposta la tua password personale"}
        </h1>
        <p>
          {isRecoveryMode
            ? "Scegli una nuova password per tornare ad accedere alla piattaforma."
            : "Completa il flusso di invito scegliendo la tua password personale prima di poter accedere allo spazio di consultazione."}
        </p>
        <ChangePasswordForm
          email={profile.email}
          shouldCompleteFirstAccess={profile.must_reset_password}
        />
      </section>
    </main>
  );
}
