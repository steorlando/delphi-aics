"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreateExpertFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdEmail?: string;
};

export type ResendInviteFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type AppError = {
  message: string;
};

type ProfilesInsertPayload = {
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  institution_name: string | null;
  role: "expert";
  must_reset_password: boolean;
  is_active: boolean;
};

type ProfilesInsertBuilder = {
  insert(values: ProfilesInsertPayload): {
    select(columns: string): {
      single<T>(): Promise<{
        data: T | null;
        error: AppError | null;
      }>;
    };
  };
};

type AdminActionLogsInsertBuilder = {
  insert(values: {
    admin_profile_id: string;
    action_type: string;
    target_table: string;
    target_id: string;
    metadata: Record<string, string>;
  }): Promise<{
    error: AppError | null;
  }>;
};

type ExpertProfileLookup = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  institution_name: string | null;
  must_reset_password: boolean;
  is_active: boolean;
};

type ProfilesSelectBuilder = {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle<T>(): Promise<{
        data: T | null;
        error: AppError | null;
      }>;
    };
  };
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createExpertAction(
  _previousState: CreateExpertFormState,
  formData: FormData,
): Promise<CreateExpertFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono creare account esperto.",
    };
  }

  const firstName = normalizeText(formData.get("firstName"));
  const lastName = normalizeText(formData.get("lastName"));
  const institutionName = normalizeText(formData.get("institutionName"));
  const email = normalizeText(formData.get("email")).toLowerCase();

  if (!firstName || !lastName || !email) {
    return {
      status: "error",
      message: "Nome, cognome ed email sono obbligatori.",
    };
  }

  const adminClient = createAdminSupabaseClient();
  const profilesTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesInsertBuilder;
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;

  const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password`;

  const { data: authData, error: authError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        first_name: firstName,
        last_name: lastName,
        institution_name: institutionName || null,
        role: "expert",
      },
    });

  if (authError || !authData.user) {
    return {
      status: "error",
      message: authError?.message ?? "Impossibile creare e invitare l'esperto.",
    };
  }

  const { data: createdProfile, error: profileError } = await profilesTable
    .insert({
      auth_user_id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      institution_name: institutionName || null,
      role: "expert",
      must_reset_password: true,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (profileError || !createdProfile) {
    await adminClient.auth.admin.deleteUser(authData.user.id);

    return {
      status: "error",
      message:
        profileError?.message ??
        "L'utente di autenticazione e' stato creato, ma non e' stato possibile salvare il profilo applicativo.",
    };
  }

  const { error: logError } = await adminActionLogsTable.insert({
    admin_profile_id: profile.id,
    action_type: "expert_invited",
    target_table: "profiles",
    target_id: createdProfile.id,
    metadata: {
      email,
      redirect_to: redirectTo,
    },
  });

  if (logError) {
    console.error("Unable to write admin action log", logError);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  return {
    status: "success",
    message: "Account esperto creato ed email di invito inviata.",
    createdEmail: email,
  };
}

export async function resendExpertInviteAction(
  _previousState: ResendInviteFormState,
  formData: FormData,
): Promise<ResendInviteFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error" as const,
      message: "Solo gli amministratori autenticati possono reinviare inviti.",
    };
  }

  const profileId = normalizeText(formData.get("profileId"));

  if (!profileId) {
    return {
      status: "error" as const,
      message: "Profilo esperto non valido.",
    };
  }

  const adminClient = createAdminSupabaseClient();
  const supabase = await createServerSupabaseClient();
  const profilesTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesSelectBuilder;
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;

  const { data: expert, error: expertError } = await profilesTable
    .select(
      "id, email, first_name, last_name, institution_name, must_reset_password, is_active",
    )
    .eq("id", profileId)
    .maybeSingle<ExpertProfileLookup>();

  if (expertError || !expert) {
    return {
      status: "error" as const,
      message: expertError?.message ?? "Esperto non trovato.",
    };
  }

  if (!expert.is_active) {
    return {
      status: "error" as const,
      message: "L'account esperto e' inattivo.",
    };
  }

  if (!expert.must_reset_password) {
    return {
      status: "error" as const,
      message: "L'esperto ha gia' completato il primo accesso: reinvia un reset password, non un invito.",
    };
  }

  const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password`;
  const { error: inviteError } = await supabase.auth.resetPasswordForEmail(
    expert.email,
    {
      redirectTo,
    },
  );

  if (inviteError) {
    return {
      status: "error" as const,
      message: inviteError.message,
    };
  }

  const { error: logError } = await adminActionLogsTable.insert({
    admin_profile_id: profile.id,
    action_type: "expert_access_email_resent",
    target_table: "profiles",
    target_id: expert.id,
    metadata: {
      email: expert.email,
      redirect_to: redirectTo,
    },
  });

  if (logError) {
    console.error("Unable to write admin action log", logError);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  return {
    status: "success" as const,
    message: `Invito reinviato a ${expert.email}.`,
  };
}
