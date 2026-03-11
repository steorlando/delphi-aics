import { requireAdminProfile } from "@/lib/auth/guards";

export default async function AdminHomePage() {
  const profile = await requireAdminProfile();

  return (
    <section className="panel-card">
      <span className="eyebrow">Admin area</span>
      <h2>Welcome, {profile.first_name}</h2>
      <p>
        This shell is ready for the next step: expert onboarding, consultation
        setup, and section management.
      </p>
    </section>
  );
}
