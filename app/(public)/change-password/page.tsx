import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getRoleHome } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="The password reset flow depends on Supabase Auth and the application profile table."
        title="Supabase is not configured yet"
      />
    );
  }

  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.is_active) {
    redirect("/login?error=profile_missing");
  }

  if (!profile.must_reset_password) {
    redirect(getRoleHome(profile.role));
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <span className="eyebrow">First access</span>
        <h1>Change your temporary password</h1>
        <p>
          This password change is mandatory before you can access the
          consultation workspace.
        </p>
        <ChangePasswordForm email={profile.email} />
      </section>
    </main>
  );
}
