export function hasPublicSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return value;
}

export function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return value;
}

export function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return value;
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL");
  }

  return value.replace(/\/+$/, "");
}

export function hasSmtpNotificationEnv() {
  return Boolean(getSmtpUserOptional() && getSmtpPassOptional());
}

function getSmtpUserOptional() {
  return process.env.SMTP_USER?.trim() || "admin@aics-delphi-salute.com";
}

function getSmtpPassOptional() {
  return process.env.SMTP_PASS?.replace(/\s+/g, "").trim() ?? "";
}

export function getSmtpHost() {
  return process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
}

export function getSmtpPort() {
  const value = process.env.SMTP_PORT?.trim();
  const parsed = value ? Number.parseInt(value, 10) : 465;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid SMTP_PORT");
  }

  return parsed;
}

export function getSmtpUser() {
  const value = getSmtpUserOptional();

  if (!value) {
    throw new Error("Missing SMTP_USER");
  }

  return value;
}

export function getSmtpPass() {
  const value = getSmtpPassOptional();

  if (!value) {
    throw new Error("Missing SMTP_PASS");
  }

  return value;
}

export function getSmtpFromEmail() {
  return process.env.SMTP_FROM_EMAIL?.trim() || getSmtpUser();
}

export function getSmtpFromName() {
  return process.env.SMTP_FROM_NAME?.trim() || "Consultazione Delphi AICS";
}
