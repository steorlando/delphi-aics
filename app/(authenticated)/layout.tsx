import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAuthenticatedProfile } from "@/lib/auth/guards";
import { hasPublicSupabaseEnv } from "@/lib/env";

type AuthenticatedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="Protected routes depend on Supabase Auth cookies and the profiles table. Configure the public Supabase variables before testing this area."
        title="Supabase is not configured yet"
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
        <div>
          <span className="eyebrow">Authenticated area</span>
          <h1 className="app-title">Delphi Consultation</h1>
          <p className="app-subtitle">
            {profile.first_name} {profile.last_name} · {profile.role}
          </p>
        </div>
        <SignOutButton />
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
