import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getPostLoginPath } from "@/lib/auth/guards";
import { getAuthContext, hasServerAuthSessionCookie } from "@/lib/auth/session";
import { hasPublicSupabaseEnv } from "@/lib/env";

export default async function HomePage() {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="L'inizializzazione del progetto e' in corso, ma l'applicazione non puo' risolvere autenticazione e profili finche' le credenziali Supabase non sono configurate."
        title="Configurazione Supabase mancante"
      />
    );
  }

  if (!(await hasServerAuthSessionCookie())) {
    redirect("/login");
  }

  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.is_active) {
    redirect("/login?error=profile_missing");
  }

  redirect(getPostLoginPath(profile));
}
