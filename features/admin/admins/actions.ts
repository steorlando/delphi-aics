"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreateAdminFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdEmail?: string;
};

export type UpdateAdminFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type DeleteAdminFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type ResendAdminInviteFormState = {
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
  role: "admin";
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

type AdminProfileLookup = {
  id: string;
  email: string;
  must_reset_password: boolean;
  is_active: boolean;
};

type AdminProfileActionLookup = {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  institution_name: string | null;
  role: "admin" | "expert";
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

type ProfilesUpdateBuilder = {
  update(values: {
    email: string;
    first_name: string;
    last_name: string;
    institution_name: string | null;
    is_active: boolean;
  }): {
    eq(column: string, value: string): {
      select(columns: string): {
        single<T>(): Promise<{
          data: T | null;
          error: AppError | null;
        }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{
      error: AppError | null;
    }>;
  };
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function logAdminAction(
  adminActionLogsTable: AdminActionLogsInsertBuilder,
  values: {
    admin_profile_id: string;
    action_type: string;
    target_table: string;
    target_id: string;
    metadata: Record<string, string>;
  },
) {
  const { error } = await adminActionLogsTable.insert(values);

  if (error) {
    console.error("Unable to write admin action log", error);
  }
}

async function inviteAdminAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  institutionName: string;
}) {
  const adminClient = createAdminSupabaseClient();
  const profilesTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesInsertBuilder;

  const { data: authData, error: authError } =
    await adminClient.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${getAppUrl()}/auth/confirm?next=/change-password`,
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        institution_name: input.institutionName || null,
        role: "admin",
      },
    });

  if (authError || !authData.user) {
    return {
      ok: false as const,
      message:
        authError?.message ??
        "Impossibile creare e invitare l'amministratore.",
    };
  }

  const { data: createdProfile, error: profileError } = await profilesTable
    .insert({
      auth_user_id: authData.user.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      institution_name: input.institutionName || null,
      role: "admin",
      must_reset_password: true,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (profileError || !createdProfile) {
    await adminClient.auth.admin.deleteUser(authData.user.id);

    return {
      ok: false as const,
      message:
        profileError?.message ??
        "L'utente di autenticazione e' stato creato, ma non e' stato possibile salvare il profilo amministrativo.",
    };
  }

  return {
    ok: true as const,
    profileId: createdProfile.id,
    email: input.email,
  };
}

export async function createAdminAction(
  _previousState: CreateAdminFormState,
  formData: FormData,
): Promise<CreateAdminFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message:
        "Solo gli amministratori autenticati possono creare altri amministratori.",
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

  const inviteResult = await inviteAdminAccount({
    email,
    firstName,
    lastName,
    institutionName,
  });

  if (!inviteResult.ok) {
    return {
      status: "error",
      message: inviteResult.message,
    };
  }

  const adminClient = createAdminSupabaseClient();
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "admin_invited",
    target_table: "profiles",
    target_id: inviteResult.profileId,
    metadata: {
      email,
      redirect_to: `${getAppUrl()}/auth/confirm?next=/change-password`,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/admins");

  return {
    status: "success",
    message: "Account amministratore creato ed email di invito inviata.",
    createdEmail: email,
  };
}

export async function updateAdminAction(
  _previousState: UpdateAdminFormState,
  formData: FormData,
): Promise<UpdateAdminFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message:
        "Solo gli amministratori autenticati possono modificare altri amministratori.",
    };
  }

  const profileId = normalizeText(formData.get("profileId"));
  const firstName = normalizeText(formData.get("firstName"));
  const lastName = normalizeText(formData.get("lastName"));
  const institutionName = normalizeText(formData.get("institutionName"));
  const email = normalizeText(formData.get("email")).toLowerCase();
  const isActive = normalizeText(formData.get("isActive")) === "true";

  if (!profileId) {
    return {
      status: "error",
      message: "Profilo amministratore non valido.",
    };
  }

  if (!firstName || !lastName || !email) {
    return {
      status: "error",
      message: "Nome, cognome ed email sono obbligatori.",
    };
  }

  if (profileId === profile.id && !isActive) {
    return {
      status: "error",
      message: "Non puoi disattivare l'amministratore con cui sei autenticato.",
    };
  }

  const adminClient = createAdminSupabaseClient();
  const profilesLookupTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesSelectBuilder;
  const profilesMutationTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesUpdateBuilder;
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;

  const { data: adminProfile, error: adminError } = await profilesLookupTable
    .select(
      "id, auth_user_id, email, first_name, last_name, institution_name, role, must_reset_password, is_active",
    )
    .eq("id", profileId)
    .maybeSingle<AdminProfileActionLookup>();

  if (adminError || !adminProfile || adminProfile.role !== "admin") {
    return {
      status: "error",
      message: adminError?.message ?? "Amministratore non trovato.",
    };
  }

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
    adminProfile.auth_user_id,
    {
      email,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        institution_name: institutionName || null,
        role: "admin",
      },
    },
  );

  if (authUpdateError) {
    return {
      status: "error",
      message:
        authUpdateError.message ??
        "Impossibile aggiornare l'account di autenticazione dell'amministratore.",
    };
  }

  const { data: updatedProfile, error: profileUpdateError } =
    await profilesMutationTable
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
        institution_name: institutionName || null,
        is_active: isActive,
      })
      .eq("id", profileId)
      .select("id")
      .single<{ id: string }>();

  if (profileUpdateError || !updatedProfile) {
    const { error: rollbackError } = await adminClient.auth.admin.updateUserById(
      adminProfile.auth_user_id,
      {
        email: adminProfile.email,
        user_metadata: {
          first_name: adminProfile.first_name,
          last_name: adminProfile.last_name,
          institution_name: adminProfile.institution_name || null,
          role: "admin",
        },
      },
    );

    if (rollbackError) {
      console.error(
        "Unable to rollback auth user after admin profile update error",
        rollbackError,
      );
    }

    return {
      status: "error",
      message:
        profileUpdateError?.message ??
        "Impossibile aggiornare il profilo amministratore.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "admin_updated",
    target_table: "profiles",
    target_id: updatedProfile.id,
    metadata: {
      email,
      previous_email: adminProfile.email,
      is_active: String(isActive),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/admins");

  return {
    status: "success",
    message: `Amministratore aggiornato: ${email}.`,
  };
}

export async function deleteAdminAction(
  _previousState: DeleteAdminFormState,
  formData: FormData,
): Promise<DeleteAdminFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message:
        "Solo gli amministratori autenticati possono eliminare altri amministratori.",
    };
  }

  const profileId = normalizeText(formData.get("profileId"));

  if (!profileId) {
    return {
      status: "error",
      message: "Profilo amministratore non valido.",
    };
  }

  if (profileId === profile.id) {
    return {
      status: "error",
      message: "Non puoi eliminare l'amministratore con cui sei autenticato.",
    };
  }

  const adminClient = createAdminSupabaseClient();
  const profilesLookupTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesSelectBuilder;
  const profilesMutationTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesUpdateBuilder;
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;

  const { data: adminProfile, error: adminError } = await profilesLookupTable
    .select(
      "id, auth_user_id, email, first_name, last_name, institution_name, role, must_reset_password, is_active",
    )
    .eq("id", profileId)
    .maybeSingle<AdminProfileActionLookup>();

  if (adminError || !adminProfile || adminProfile.role !== "admin") {
    return {
      status: "error",
      message: adminError?.message ?? "Amministratore non trovato.",
    };
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
    adminProfile.auth_user_id,
  );

  if (authDeleteError) {
    return {
      status: "error",
      message:
        authDeleteError.message ??
        "Impossibile eliminare l'account di autenticazione dell'amministratore.",
    };
  }

  const { error: profileDeleteError } = await profilesMutationTable
    .delete()
    .eq("id", profileId);

  if (profileDeleteError) {
    return {
      status: "error",
      message:
        profileDeleteError.message ??
        "L'utente Auth e' stato eliminato, ma non e' stato possibile completare la pulizia del profilo amministrativo.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "admin_deleted",
    target_table: "profiles",
    target_id: adminProfile.id,
    metadata: {
      email: adminProfile.email,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/admins");

  return {
    status: "success",
    message: `Amministratore eliminato: ${adminProfile.email}.`,
  };
}

export async function resendAdminInviteAction(
  _previousState: ResendAdminInviteFormState,
  formData: FormData,
): Promise<ResendAdminInviteFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message:
        "Solo gli amministratori autenticati possono reinviare email di accesso.",
    };
  }

  const profileId = normalizeText(formData.get("profileId"));

  if (!profileId) {
    return {
      status: "error",
      message: "Profilo amministratore non valido.",
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

  const { data: adminProfile, error: adminError } = await profilesTable
    .select("id, email, must_reset_password, is_active")
    .eq("id", profileId)
    .maybeSingle<AdminProfileLookup>();

  if (adminError || !adminProfile) {
    return {
      status: "error",
      message: adminError?.message ?? "Amministratore non trovato.",
    };
  }

  if (!adminProfile.is_active) {
    return {
      status: "error",
      message: "L'account amministratore e' inattivo.",
    };
  }

  if (!adminProfile.must_reset_password) {
    return {
      status: "error",
      message:
        "L'amministratore ha gia' completato il primo accesso e non richiede piu' questo link.",
    };
  }

  const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password`;
  const { error: inviteError } = await supabase.auth.signInWithOtp({
    email: adminProfile.email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (inviteError) {
    return {
      status: "error",
      message:
        inviteError.message ||
        "Impossibile reinviare l'email di primo accesso all'amministratore.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "admin_access_email_resent",
    target_table: "profiles",
    target_id: adminProfile.id,
    metadata: {
      email: adminProfile.email,
      redirect_to: redirectTo,
      delivery_type: "magiclink",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/admins");

  return {
    status: "success",
    message: `Email di accesso reinviata a ${adminProfile.email}.`,
  };
}
