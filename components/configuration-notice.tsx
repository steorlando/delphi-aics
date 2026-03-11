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
        <span className="eyebrow">Setup required</span>
        <h1>{title}</h1>
        <p>{body}</p>
        <p className="muted">
          Configure <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> before continuing.
        </p>
      </section>
    </main>
  );
}
