import { redirect } from "next/navigation";
import { AicsLogo } from "@/components/aics-logo";

type ConfirmPageProps = {
  searchParams: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
};

export default async function ConfirmPage({
  searchParams,
}: ConfirmPageProps) {
  const { code, token_hash: tokenHash, type, next } = await searchParams;
  const hasAuthPayload = Boolean(code || (tokenHash && type));

  if (!hasAuthPayload) {
    redirect("/login?error=invite_invalid");
  }

  const safeNext = next?.startsWith("/") ? next : "/";
  const isRecovery = type === "recovery";

  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <AicsLogo className="auth-brand" />
        <span className="eyebrow">
          {isRecovery ? "Recupero password" : "Primo accesso"}
        </span>
        <h1>
          {isRecovery
            ? "Conferma il recupero password"
            : "Conferma il primo accesso"}
        </h1>
        <p>
          Per sicurezza completiamo il collegamento solo dopo una tua conferma
          esplicita. Questo evita che alcuni provider email consumino il link in
          automatico prima che tu possa usarlo.
        </p>

        <form action="/auth/complete" className="auth-form" method="post">
          <input name="code" type="hidden" value={code ?? ""} />
          <input name="token_hash" type="hidden" value={tokenHash ?? ""} />
          <input name="type" type="hidden" value={type ?? ""} />
          <input name="next" type="hidden" value={safeNext} />

          <button className="primary-button" type="submit">
            {isRecovery ? "Continua al cambio password" : "Continua"}
          </button>
        </form>
      </section>
    </main>
  );
}
