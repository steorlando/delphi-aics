import { redirect } from "next/navigation";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getPostLoginPath } from "@/lib/auth/guards";
import { getAuthContext } from "@/lib/auth/session";
import { hasPublicSupabaseEnv } from "@/lib/env";

export default async function HomePage() {
  if (!hasPublicSupabaseEnv()) {
    return (
      <ConfigurationNotice
        body="The project bootstrap is running, but the application cannot resolve authentication or profiles until Supabase credentials are configured."
        title="Supabase configuration missing"
      />
    );
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
