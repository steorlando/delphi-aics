import { ConfigurationNotice } from "@/components/configuration-notice";
import { SignOutButton } from "@/components/sign-out-button";
import { redirectAuthenticatedUserFromPublicRoute } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

function getErrorMessage(errorCode?: string) {
  if (errorCode === "profile_missing") {
    return "Your account is authenticated but not provisioned in the application profile table yet.";
  }

  return null;
}

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="The app shell is ready, but authentication cannot start until Supabase environment variables are configured."
        title="Supabase is not configured yet"
      />
    );
  }

  await redirectAuthenticatedUserFromPublicRoute();

  const { user, profile } = await getAuthContext();
  const { error } = await searchParams;
  const errorMessage = getErrorMessage(error);

  const showProvisioningIssue = Boolean(user && !profile);

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <span className="eyebrow">Delphi consultation</span>
        <h1>Sign in</h1>
        <p>
          Experts and administrators use the same login. Access is controlled by
          your application profile and consultation role.
        </p>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        {showProvisioningIssue ? (
          <>
            <p className="muted">
              The current session exists in Supabase Auth, but no active
              application profile was found.
            </p>
            <SignOutButton />
          </>
        ) : (
          <LoginForm />
        )}
      </section>
    </main>
  );
}
