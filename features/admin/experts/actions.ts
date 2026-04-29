"use server";

import { revalidatePath } from "next/cache";
import { buildAuthConfirmUrl } from "@/lib/auth/email-links";
import { getAuthContext } from "@/lib/auth/session";
import { sendFirstAccessEmail } from "@/lib/email/smtp";
import { getAppUrl } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type CreateExpertFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdEmail?: string;
};

export type ImportExpertsFormState = {
  status: "idle" | "success" | "error" | "partial";
  message?: string;
  summary?: {
    processed: number;
    created: number;
    failed: number;
  };
  failures?: string[];
};

export type UpdateExpertFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type DeleteExpertFormState = {
  status: "idle" | "success" | "error";
  message: string;
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

type ExpertProfileActionLookup = ExpertProfileLookup & {
  auth_user_id: string;
  role: "expert" | "admin";
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

type InviteExpertInput = {
  email: string;
  firstName: string;
  lastName: string;
  institutionName: string;
};

type InviteExpertResult =
  | {
      ok: true;
      authUserId: string;
      profileId: string;
      email: string;
    }
  | {
      ok: false;
      email: string;
      message: string;
    };

const MAX_CSV_IMPORT_ROWS = 50;
const MAX_CSV_FILE_SIZE_BYTES = 1024 * 1024;

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      const nextCharacter = content[index + 1];

      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && content[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows;
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

async function inviteExpertAccount(
  adminClient: ReturnType<typeof createAdminSupabaseClient>,
  input: InviteExpertInput,
): Promise<InviteExpertResult> {
  const profilesTable = adminClient.from(
    "profiles",
  ) as unknown as ProfilesInsertBuilder;
  const displayName = `${input.firstName} ${input.lastName}`.trim() || input.email;

  const { data: authData, error: authError } =
    await adminClient.auth.admin.generateLink({
      type: "invite",
      email: input.email,
      options: {
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          institution_name: input.institutionName || null,
          role: "expert",
        },
      },
    });

  if (authError || !authData.user || !authData.properties?.hashed_token) {
    return {
      ok: false as const,
      email: input.email,
      message:
        authError?.message ?? "Impossibile creare e invitare l'esperto.",
    };
  }

  const { data: createdProfile, error: profileError } = await profilesTable
    .insert({
      auth_user_id: authData.user.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      institution_name: input.institutionName || null,
      role: "expert",
      must_reset_password: true,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>();

  if (profileError || !createdProfile) {
    await adminClient.auth.admin.deleteUser(authData.user.id);

    return {
      ok: false as const,
      email: input.email,
      message:
        profileError?.message ??
        "L'utente di autenticazione e' stato creato, ma non e' stato possibile salvare il profilo applicativo.",
    };
  }

  try {
    await sendFirstAccessEmail({
      email: input.email,
      link: buildAuthConfirmUrl({
        tokenHash: authData.properties.hashed_token,
        type: authData.properties.verification_type,
      }),
      name: displayName,
    });
  } catch (error) {
    await adminClient.from("profiles").delete().eq("id", createdProfile.id);
    await adminClient.auth.admin.deleteUser(authData.user.id);

    return {
      ok: false as const,
      email: input.email,
      message:
        error instanceof Error
          ? error.message
          : "L'account e' stato creato, ma non e' stato possibile inviare l'email di primo accesso.",
    };
  }

  return {
    ok: true as const,
    authUserId: authData.user.id,
    profileId: createdProfile.id,
    email: input.email,
  };
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
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const inviteResult = await inviteExpertAccount(adminClient, {
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

  const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password`;
  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "expert_invited",
    target_table: "profiles",
    target_id: inviteResult.profileId,
    metadata: {
      email,
      redirect_to: redirectTo,
      source: "single_create",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  return {
    status: "success",
    message: "Account esperto creato ed email di invito inviata.",
    createdEmail: email,
  };
}

export async function importExpertsAction(
  _previousState: ImportExpertsFormState,
  formData: FormData,
): Promise<ImportExpertsFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono importare esperti.",
    };
  }

  const csvFile = formData.get("csvFile");

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return {
      status: "error",
      message: "Seleziona un file CSV da importare.",
    };
  }

  if (csvFile.size > MAX_CSV_FILE_SIZE_BYTES) {
    return {
      status: "error",
      message: "Il file CSV e' troppo grande. Mantieni il file sotto 1 MB.",
    };
  }

  const csvContent = await csvFile.text();
  const rows = parseCsv(csvContent)
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rows.length < 2) {
    return {
      status: "error",
      message:
        "Il file CSV deve includere una riga di intestazione e almeno un esperto.",
    };
  }

  const headerMap = new Map<string, number>();

  rows[0].forEach((header, index) => {
    headerMap.set(normalizeCsvHeader(header), index);
  });

  const firstNameIndex =
    headerMap.get("first_name") ??
    headerMap.get("nome") ??
    headerMap.get("name");
  const lastNameIndex =
    headerMap.get("last_name") ??
    headerMap.get("cognome") ??
    headerMap.get("surname");
  const emailIndex = headerMap.get("email") ?? headerMap.get("e-mail");
  const institutionIndex =
    headerMap.get("institution_name") ??
    headerMap.get("istituzione") ??
    headerMap.get("institution") ??
    headerMap.get("organization");

  if (
    firstNameIndex === undefined ||
    lastNameIndex === undefined ||
    emailIndex === undefined
  ) {
    return {
      status: "error",
      message:
        "Intestazioni CSV non valide. Usa almeno: first_name, last_name, email. institution_name e' opzionale.",
    };
  }

  const dataRows = rows.slice(1);

  if (dataRows.length > MAX_CSV_IMPORT_ROWS) {
    return {
      status: "error",
      message: `Importa al massimo ${MAX_CSV_IMPORT_ROWS} esperti per volta per mantenere controllabile l'invio delle email.`,
    };
  }

  const adminClient = createAdminSupabaseClient();
  const adminActionLogsTable = adminClient.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password`;
  const failures: string[] = [];
  const seenEmails = new Set<string>();
  let created = 0;

  for (const [index, row] of dataRows.entries()) {
    const lineNumber = index + 2;
    const firstName = (row[firstNameIndex] ?? "").trim();
    const lastName = (row[lastNameIndex] ?? "").trim();
    const email = (row[emailIndex] ?? "").trim().toLowerCase();
    const institutionName =
      institutionIndex === undefined ? "" : (row[institutionIndex] ?? "").trim();

    if (!firstName || !lastName || !email) {
      failures.push(
        `Riga ${lineNumber}: nome, cognome ed email sono obbligatori.`,
      );
      continue;
    }

    if (seenEmails.has(email)) {
      failures.push(`Riga ${lineNumber}: email duplicata nel file (${email}).`);
      continue;
    }

    seenEmails.add(email);

    const inviteResult = await inviteExpertAccount(adminClient, {
      email,
      firstName,
      lastName,
      institutionName,
    });

    if (!inviteResult.ok) {
      failures.push(`Riga ${lineNumber} (${email}): ${inviteResult.message}`);
      continue;
    }

    created += 1;

    await logAdminAction(adminActionLogsTable, {
      admin_profile_id: profile.id,
      action_type: "expert_invited",
      target_table: "profiles",
      target_id: inviteResult.profileId,
      metadata: {
        email,
        redirect_to: redirectTo,
        source: "csv_import",
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  const failed = failures.length;
  const processed = dataRows.length;

  if (created === 0) {
    return {
      status: "error",
      message: "Nessun esperto e' stato importato.",
      summary: {
        processed,
        created,
        failed,
      },
      failures,
    };
  }

  return {
    status: failed > 0 ? "partial" : "success",
    message:
      failed > 0
        ? `Import completato con errori: ${created} inviti inviati, ${failed} righe non importate.`
        : `Import completato: ${created} esperti creati e invitati.`,
    summary: {
      processed,
      created,
      failed,
    },
    failures,
  };
}

export async function updateExpertAction(
  _previousState: UpdateExpertFormState,
  formData: FormData,
): Promise<UpdateExpertFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message:
        "Solo gli amministratori autenticati possono modificare account esperto.",
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
      message: "Profilo esperto non valido.",
    };
  }

  if (!firstName || !lastName || !email) {
    return {
      status: "error",
      message: "Nome, cognome ed email sono obbligatori.",
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

  const { data: expert, error: expertError } = await profilesLookupTable
    .select(
      "id, auth_user_id, email, first_name, last_name, institution_name, role, must_reset_password, is_active",
    )
    .eq("id", profileId)
    .maybeSingle<ExpertProfileActionLookup>();

  if (expertError || !expert || expert.role !== "expert") {
    return {
      status: "error",
      message: expertError?.message ?? "Esperto non trovato.",
    };
  }

  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
    expert.auth_user_id,
    {
      email,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        institution_name: institutionName || null,
        role: "expert",
      },
    },
  );

  if (authUpdateError) {
    return {
      status: "error",
      message:
        authUpdateError.message ??
        "Impossibile aggiornare l'account di autenticazione dell'esperto.",
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
      expert.auth_user_id,
      {
        email: expert.email,
        user_metadata: {
          first_name: expert.first_name,
          last_name: expert.last_name,
          institution_name: expert.institution_name || null,
          role: "expert",
        },
      },
    );

    if (rollbackError) {
      console.error(
        "Unable to rollback auth user after profile update error",
        rollbackError,
      );
    }

    return {
      status: "error",
      message:
        profileUpdateError?.message ??
        "Impossibile aggiornare il profilo esperto.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "expert_updated",
    target_table: "profiles",
    target_id: updatedProfile.id,
    metadata: {
      email,
      previous_email: expert.email,
      is_active: String(isActive),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  return {
    status: "success",
    message: `Esperto aggiornato: ${email}.`,
  };
}

export async function deleteExpertAction(
  _previousState: DeleteExpertFormState,
  formData: FormData,
): Promise<DeleteExpertFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message:
        "Solo gli amministratori autenticati possono eliminare account esperto.",
    };
  }

  const profileId = normalizeText(formData.get("profileId"));

  if (!profileId) {
    return {
      status: "error",
      message: "Profilo esperto non valido.",
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

  const { data: expert, error: expertError } = await profilesLookupTable
    .select(
      "id, auth_user_id, email, first_name, last_name, institution_name, role, must_reset_password, is_active",
    )
    .eq("id", profileId)
    .maybeSingle<ExpertProfileActionLookup>();

  if (expertError || !expert || expert.role !== "expert") {
    return {
      status: "error",
      message: expertError?.message ?? "Esperto non trovato.",
    };
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
    expert.auth_user_id,
  );

  if (authDeleteError) {
    return {
      status: "error",
      message:
        authDeleteError.message ??
        "Impossibile eliminare l'account di autenticazione dell'esperto.",
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
        "L'utente Auth e' stato eliminato, ma non e' stato possibile completare la pulizia del profilo applicativo.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "expert_deleted",
    target_table: "profiles",
    target_id: expert.id,
    metadata: {
      email: expert.email,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  return {
    status: "success",
    message: `Esperto eliminato: ${expert.email}.`,
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
      message: "Solo gli amministratori autenticati possono reinviare email di accesso.",
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
      message:
        "L'esperto ha gia' completato il primo accesso e non richiede piu' questo link.",
    };
  }

  const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password`;
  const { data: linkData, error: inviteError } =
    await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: expert.email,
    });

  if (inviteError || !linkData.properties?.hashed_token) {
    return {
      status: "error" as const,
      message:
        inviteError?.message ||
        "Impossibile generare il link di primo accesso all'esperto.",
    };
  }

  try {
    await sendFirstAccessEmail({
      email: expert.email,
      link: buildAuthConfirmUrl({
        tokenHash: linkData.properties.hashed_token,
        type: linkData.properties.verification_type,
      }),
      name: `${expert.first_name} ${expert.last_name}`.trim() || expert.email,
    });
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Impossibile inviare l'email di primo accesso all'esperto.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    action_type: "expert_access_email_resent",
    target_table: "profiles",
    target_id: expert.id,
    metadata: {
      email: expert.email,
      redirect_to: redirectTo,
      delivery_type: "app_smtp_magiclink",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/experts");

  return {
    status: "success" as const,
    message: `Email di accesso reinviata a ${expert.email}.`,
  };
}
