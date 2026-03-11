import { AicsLogo } from "@/components/aics-logo";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { SignOutButton } from "@/components/sign-out-button";
import { redirectAuthenticatedUserFromPublicRoute } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { hasPublicSupabaseEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

function getErrorMessage(errorCode?: string) {
  if (errorCode === "profile_missing") {
    return "Il tuo account e' autenticato, ma non e' ancora stato registrato nella tabella dei profili applicativi.";
  }

  if (errorCode === "invite_invalid") {
    return "Il link di invito non e' valido o e' scaduto. Chiedi a un amministratore di inviarne uno nuovo.";
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
        body="La struttura dell'app e' pronta, ma l'autenticazione non puo' iniziare finche' le variabili di ambiente di Supabase non sono configurate."
        title="Supabase non e' ancora configurato"
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
        <AicsLogo className="auth-brand" />
        <span className="eyebrow">Consultazione Delphi</span>
        <h1>Accedi</h1>
        <p>
          Esperti e amministratori usano lo stesso accesso. I permessi dipendono
          dal tuo profilo applicativo e dal ruolo nella consultazione.
        </p>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        {showProvisioningIssue ? (
          <>
            <p className="muted">
              La sessione corrente esiste in Supabase Auth, ma non e&apos; stato
              trovato alcun profilo applicativo attivo.
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
