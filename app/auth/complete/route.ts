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

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmailOtpType(value: string): value is EmailOtpType {
  return emailOtpTypes.has(value as EmailOtpType);
}

function getSafeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/login?error=invite_invalid", request.url),
  );
}

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const code = normalizeText(formData.get("code"));
  const tokenHash = normalizeText(formData.get("token_hash"));
  const type = normalizeText(formData.get("type"));
  const safeNext = getSafeNext(normalizeText(formData.get("next")));
  const redirectUrl = new URL(safeNext, requestUrl.origin);

  if (type === "recovery") {
    redirectUrl.searchParams.set("mode", "recovery");
  }

  const response = NextResponse.redirect(redirectUrl);
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
    new URL("/login?error=invite_invalid", requestUrl.origin),
  );
}
