import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

const emailOtpTypes = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const);

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

function isEmailOtpType(value: string): value is EmailOtpType {
  return emailOtpTypes.has(value as EmailOtpType);
}

function normalizeValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = normalizeValue(formData.get("code"));
  const tokenHash = normalizeValue(formData.get("token_hash"));
  const type = normalizeValue(formData.get("type"));
  const next = normalizeValue(formData.get("next")) || "/";
  const safeNext = next.startsWith("/") ? next : "/";
  const redirectUrl = new URL(safeNext, request.url);

  if (type === "recovery") {
    redirectUrl.searchParams.set("mode", "recovery");
  }

  const response = NextResponse.redirect(redirectUrl, 303);

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  if (tokenHash && type && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=invite_invalid", request.url),
    303,
  );
}
