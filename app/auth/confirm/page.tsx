import { AicsLogo } from "@/components/aics-logo";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { hasPublicSupabaseEnv } from "@/lib/env";

type ConfirmAuthPageProps = {
  searchParams: Promise<{
    code?: string;
    next?: string;
    token_hash?: string;
    type?: string;
  }>;
};

export default async function ConfirmAuthPage({
  searchParams,
}: ConfirmAuthPageProps) {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="Il flusso di conferma dipende da Supabase Auth e non puo' continuare finche' le variabili pubbliche non sono configurate."
        title="Supabase non e' ancora configurato"
      />
    );
  }

  const { code, next, token_hash: tokenHash, type } = await searchParams;
  const hasAuthToken = Boolean(code || tokenHash);

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <AicsLogo className="auth-brand" />
        <span className="eyebrow">Conferma accesso</span>
        <h1>Apri il link di accesso</h1>
        {hasAuthToken ? (
          <>
            <p>
              Per proteggere il tuo invito, la sessione viene attivata solo dopo
              questa conferma manuale.
            </p>
            <form action="/auth/complete" className="auth-form" method="post">
              <input name="code" type="hidden" value={code ?? ""} />
              <input name="token_hash" type="hidden" value={tokenHash ?? ""} />
              <input name="type" type="hidden" value={type ?? ""} />
              <input name="next" type="hidden" value={next ?? ""} />
              <button className="primary-button" type="submit">
                Conferma accesso
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="form-error">
              Il link non contiene un token valido. Chiedi a un amministratore di
              inviare un nuovo invito.
            </p>
            <a className="primary-link" href="/login">
              Torna al login
            </a>
          </>
        )}
      </section>
    </main>
  );
}
