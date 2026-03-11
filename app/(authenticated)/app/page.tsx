import { requireExpertProfile } from "@/lib/auth/guards";

export default async function ExpertHomePage() {
  const profile = await requireExpertProfile();

  return (
    <section className="panel-card">
      <span className="eyebrow">Expert area</span>
      <h2>Welcome, {profile.first_name}</h2>
      <p>
        Your consultation workspace will appear here once the section-based
        commenting flow is implemented.
      </p>
    </section>
  );
}
