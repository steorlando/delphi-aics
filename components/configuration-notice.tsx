type ConfigurationNoticeProps = {
  title: string;
  body: string;
};

export function ConfigurationNotice({
  title,
  body,
}: ConfigurationNoticeProps) {
  return (
    <main className="auth-page-shell">
      <section className="auth-card">
        <span className="eyebrow">Configurazione richiesta</span>
        <h1>{title}</h1>
        <p>{body}</p>
        <p className="muted">
          Configura <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> prima di continuare.
        </p>
      </section>
    </main>
  );
}
