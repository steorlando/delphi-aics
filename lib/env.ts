function getEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function hasPublicSupabaseEnv() {
  return Boolean(
    getEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export function getSupabaseUrl() {
  const value = getEnv("NEXT_PUBLIC_SUPABASE_URL");

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return value;
}

export function getSupabaseAnonKey() {
  const value = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return value;
}

export function getSupabaseServiceRoleKey() {
  const value = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return value;
}
