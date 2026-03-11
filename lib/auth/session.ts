import { cache } from "react";
import type { AppProfile } from "@/lib/auth/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const profileSelect = [
  "id",
  "auth_user_id",
  "email",
  "first_name",
  "last_name",
  "institution_name",
  "role",
  "must_reset_password",
  "is_active",
].join(", ");

export const getAuthContext = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("auth_user_id", user.id)
    .maybeSingle<AppProfile>();

  if (profileError) {
    throw profileError;
  }

  return {
    user,
    profile: profile ?? null,
  };
});
