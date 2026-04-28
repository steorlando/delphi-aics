import { NextResponse, type NextRequest } from "next/server";
import { buildAuthConfirmUrl } from "@/lib/auth/email-links";
import {
  sendFirstAccessEmail,
  sendPasswordRecoveryEmail,
} from "@/lib/email/smtp";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RecoveryProfile = {
  first_name: string;
  is_active: boolean;
  last_name: string;
  must_reset_password: boolean;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function successResponse() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Richiesta non valida." },
      { status: 400 },
    );
  }

  const email = normalizeEmail(
    payload && typeof payload === "object" && "email" in payload
      ? payload.email
      : "",
  );

  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Email obbligatoria." },
      { status: 400 },
    );
  }

  const adminClient = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("first_name, last_name, must_reset_password, is_active")
    .eq("email", email)
    .maybeSingle<RecoveryProfile>();

  if (profileError || !profile?.is_active) {
    console.warn(
      "Unable to find an active profile for password recovery",
      profileError,
    );
    return successResponse();
  }

  const name = `${profile.first_name} ${profile.last_name}`.trim() || email;
  const isFirstAccess = profile.must_reset_password;
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: isFirstAccess ? "magiclink" : "recovery",
    email,
  });

  if (error || !data.properties?.hashed_token) {
    console.warn("Unable to generate password recovery link", error);
    return successResponse();
  }

  try {
    if (isFirstAccess) {
      await sendFirstAccessEmail({
        email,
        link: buildAuthConfirmUrl({
          tokenHash: data.properties.hashed_token,
          type: data.properties.verification_type,
        }),
        name,
      });
    } else {
      await sendPasswordRecoveryEmail({
        email,
        link: buildAuthConfirmUrl({
          tokenHash: data.properties.hashed_token,
          type: data.properties.verification_type,
        }),
        name,
      });
    }
  } catch (error) {
    console.error("Unable to send password recovery email", error);
  }

  return successResponse();
}
