"use server";

import { revalidatePath } from "next/cache";
import {
  consultationStates,
  slugifySectionTitle,
  type ConsultationState,
} from "@/features/admin/consultations/shared";
import {
  expertCommentPriorityLevels,
  type ExpertSectionCommentPriority,
} from "@/features/expert/consultations/shared";
import { sendCommentModerationNotification } from "@/lib/email/smtp";
import { hasSmtpNotificationEnv } from "@/lib/env";
import { getAuthContext } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CreateConsultationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdConsultationId?: string;
};

export type UpdateConsultationFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type DeleteConsultationFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type CreateDocumentSectionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdSectionId?: string;
};

export type UpdateDocumentSectionFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type DeleteDocumentSectionFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type UpdateConsultationParticipantsFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type AdminCommentNotificationActionType = "updated" | "deleted";

type AdminCommentSnapshot = {
  bodyText: string | null;
  title: string;
};

export type AdminCommentNotificationContext = {
  actionType: AdminCommentNotificationActionType;
  commentId: string;
  consultationId: string;
  nextComment: AdminCommentSnapshot | null;
  previousComment: AdminCommentSnapshot;
  sectionId: string;
};

export type UpdateAdminConsultationCommentFormState = {
  status: "idle" | "success" | "error";
  message: string;
  notificationContext: AdminCommentNotificationContext | null;
};

export type CreateAdminConsultationCommentFormState = {
  status: "idle" | "success" | "error";
  message: string;
  createdCommentId?: string;
};

export type SendAdminCommentNotificationFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type RestoreAdminConsultationCommentFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type ToggleAdminConsultationCommentPhase2ReviewFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type ReorderAdminConsultationCommentsFormState = {
  status: "success" | "error";
  message: string;
};

type AppError = {
  code?: string;
  message: string;
};

type AdminActionLogsInsertBuilder = {
  insert(values: {
    admin_profile_id: string;
    consultation_id?: string | null;
    action_type: string;
    target_table: string;
    target_id: string;
    metadata: Record<string, string>;
  }): Promise<{
    error: AppError | null;
  }>;
};

type ConsultationsInsertBuilder = {
  insert(values: {
    title: string;
    description: string | null;
    current_state: ConsultationState;
    document_title: string | null;
    document_description: string | null;
    is_active: boolean;
    created_by_profile_id: string;
  }): {
    select(columns: string): {
      single<T>(): Promise<{
        data: T | null;
        error: AppError | null;
      }>;
    };
  };
};

type ConsultationsUpdateBuilder = {
  update(values: {
    title: string;
    description: string | null;
    current_state: ConsultationState;
    document_title: string | null;
    document_description: string | null;
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

type DocumentSectionsInsertBuilder = {
  insert(values: {
    consultation_id: string;
    title: string;
    slug: string;
    order_index: number;
    body_text: string | null;
    reference_label: string | null;
    is_active: boolean;
  }): {
    select(columns: string): {
      single<T>(): Promise<{
        data: T | null;
        error: AppError | null;
      }>;
    };
  };
};

type DocumentSectionsUpdateBuilder = {
  update(values: {
    title: string;
    slug: string;
    order_index: number;
    body_text: string | null;
    reference_label: string | null;
    is_active: boolean;
  }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        select(columns: string): {
          single<T>(): Promise<{
            data: T | null;
            error: AppError | null;
          }>;
        };
      };
    };
  };
  delete(): {
    eq(column: string, value: string): {
      eq(column: string, value: string): Promise<{
        error: AppError | null;
      }>;
    };
  };
};

type ExpertSectionCommentsUpdateBuilder = {
  update(values: {
    title: string;
    body_text: string | null;
    priority: ExpertSectionCommentPriority;
    updated_at: string;
  }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          select(columns: string): {
            maybeSingle<T>(): Promise<{
              data: T | null;
              error: AppError | null;
            }>;
          };
        };
      };
    };
  };
};

type ExpertSectionCommentsInsertBuilder = {
  insert(values: {
    consultation_id: string;
    section_id: string;
    expert_profile_id: string;
    title: string;
    body_text: string | null;
    priority: ExpertSectionCommentPriority;
    is_active: boolean;
  }): {
    select(columns: string): {
      single<T>(): Promise<{
        data: T | null;
        error: AppError | null;
      }>;
    };
  };
};

type ExpertSectionCommentsSoftDeleteBuilder = {
  update(values: {
    is_active: boolean;
    updated_at: string;
  }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          select(columns: string): {
            maybeSingle<T>(): Promise<{
              data: T | null;
              error: AppError | null;
            }>;
          };
        };
      };
    };
  };
};

type ExpertSectionCommentsPhase2ReviewBuilder = {
  update(values: {
    is_phase_2_reviewed: boolean;
    updated_at: string;
  }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        select(columns: string): {
          maybeSingle<T>(): Promise<{
            data: T | null;
            error: AppError | null;
          }>;
        };
      };
    };
  };
};

type ExpertSectionCommentsReorderBuilder = {
  update(values: {
    display_order: number;
  }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          select(columns: string): {
            maybeSingle<T>(): Promise<{
              data: T | null;
              error: AppError | null;
            }>;
          };
        };
      };
    };
  };
};

type ConsultationParticipantsInsertBuilder = {
  insert(
    values:
      | {
          consultation_id: string;
          profile_id: string;
          is_active: boolean;
        }
      | {
          consultation_id: string;
          profile_id: string;
          is_active: boolean;
        }[],
  ): Promise<{
    error: AppError | null;
  }>;
  delete(): {
    eq(column: string, value: string): {
      in(column: string, values: string[]): Promise<{
        error: AppError | null;
      }>;
    };
  };
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizeBooleanValue(value: FormDataEntryValue | null) {
  return normalizeText(value) === "true";
}

function normalizeStrictBooleanValue(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value);

  if (normalized !== "true" && normalized !== "false") {
    return null;
  }

  return normalized === "true";
}

function normalizePositiveInteger(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value);
  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeConsultationState(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value) as ConsultationState;

  if (!consultationStates.includes(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeCommentPriority(value: FormDataEntryValue | null) {
  const normalized = normalizeText(value) as ExpertSectionCommentPriority;

  if (!expertCommentPriorityLevels.includes(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeNotificationMessage(value: FormDataEntryValue | null) {
  return normalizeText(value);
}

function normalizeCommentNotificationActionType(
  value: FormDataEntryValue | null,
) {
  const normalized = normalizeText(
    value,
  ) as AdminCommentNotificationActionType;

  if (normalized !== "updated" && normalized !== "deleted") {
    return null;
  }

  return normalized;
}

function normalizeStringArray(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value) => value.length > 0),
    ),
  );
}

function getConsultationDetailPath(consultationId: string) {
  return `/admin/consultations/${consultationId}`;
}

function isMissingColumnError(
  error: AppError | null,
  relationName: string,
  columnName: string,
) {
  if (!error?.message) {
    return false;
  }

  return error.message.includes(`'${columnName}' column of '${relationName}'`)
    || error.message.includes(`${relationName}.${columnName}`);
}

function getDeletedCommentsPath(consultationId: string) {
  return `/admin/consultations/${consultationId}/deleted-comments`;
}

function getExpertConsultationPath(consultationId: string) {
  return `/app/${consultationId}`;
}

function getConstraintErrorMessage(error: AppError | null) {
  if (!error) {
    return null;
  }

  switch (error.code) {
    case "23505":
      if (error.message.includes("document_sections_slug_unique")) {
        return "Esiste gia' una sezione con questo slug nella consultazione.";
      }

      if (error.message.includes("document_sections_order_unique")) {
        return "Esiste gia' una sezione con questo numero d'ordine.";
      }

      return "Esiste gia' un record con questi dati.";
    case "23514":
      return "I dati inseriti non rispettano i vincoli previsti.";
    default:
      return null;
  }
}

async function logAdminAction(
  adminActionLogsTable: AdminActionLogsInsertBuilder,
  values: {
    admin_profile_id: string;
    consultation_id?: string | null;
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

async function maybeSendCommentAuthorNotification(input: {
  actionType: "updated" | "deleted";
  commentTitle: string;
  consultationTitle: string;
  nextComment: {
    bodyText: string | null;
    title: string;
  } | null;
  previousComment: {
    bodyText: string | null;
    title: string;
  };
  recipientEmail: string;
  recipientName: string;
  sectionTitle: string;
  shouldNotifyAuthor: boolean;
  notificationMessage: string;
}) {
  if (!input.shouldNotifyAuthor) {
    return null;
  }

  try {
    await sendCommentModerationNotification({
      actionType: input.actionType,
      adminMessage: input.notificationMessage,
      commentTitle: input.commentTitle,
      consultationTitle: input.consultationTitle,
      nextComment: input.nextComment,
      previousComment: input.previousComment,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      sectionTitle: input.sectionTitle,
    });

    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Invio della notifica email non riuscito.";
  }
}

export async function createConsultationAction(
  _previousState: CreateConsultationFormState,
  formData: FormData,
): Promise<CreateConsultationFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono creare consultazioni.",
    };
  }

  const title = normalizeText(formData.get("title"));
  const description = normalizeOptionalText(formData.get("description"));
  const documentTitle = normalizeOptionalText(formData.get("documentTitle"));
  const documentDescription = normalizeOptionalText(formData.get("documentDescription"));

  if (!title) {
    return {
      status: "error",
      message: "Il titolo della consultazione e' obbligatorio.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const consultationsTable = supabase.from(
    "consultations",
  ) as unknown as ConsultationsInsertBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const insertQuery = consultationsTable
    .insert({
      title,
      description,
      current_state: "draft",
      document_title: documentTitle,
      document_description: documentDescription,
      is_active: true,
      created_by_profile_id: profile.id,
    })
    .select("id")
    .single() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await insertQuery;

  if (error || !data) {
    return {
      status: "error",
      message:
        getConstraintErrorMessage(error) ??
        error?.message ??
        "Impossibile creare la consultazione.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: data.id,
    action_type: "consultation_created",
    target_table: "consultations",
    target_id: data.id,
    metadata: {
      title,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(data.id));

  return {
    status: "success",
    message: "Consultazione creata. Ora puoi configurare sezioni e dettagli.",
    createdConsultationId: data.id,
  };
}

export async function updateConsultationAction(
  _previousState: UpdateConsultationFormState,
  formData: FormData,
): Promise<UpdateConsultationFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono modificare consultazioni.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const title = normalizeText(formData.get("title"));
  const description = normalizeOptionalText(formData.get("description"));
  const documentTitle = normalizeOptionalText(formData.get("documentTitle"));
  const documentDescription = normalizeOptionalText(formData.get("documentDescription"));
  const currentState = normalizeConsultationState(formData.get("currentState"));
  const isActive = normalizeBooleanValue(formData.get("isActive"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo della consultazione e' obbligatorio.",
    };
  }

  if (!currentState) {
    return {
      status: "error",
      message: "Stato della consultazione non valido.",
    };
  }

  const supabase = await createServerSupabaseClient();

  if (currentState === "phase_1_open") {
    const participantCountQuery = supabase
      .from("consultation_participants")
      .select("id", { count: "exact", head: true })
      .eq("consultation_id", consultationId)
      .eq("is_active", true) as unknown as Promise<{
      count: number | null;
      error: AppError | null;
    }>;
    const { count, error: participantCountError } = await participantCountQuery;

    if (participantCountError) {
      return {
        status: "error",
        message:
          participantCountError.message ||
          "Impossibile verificare i partecipanti della consultazione.",
      };
    }

    if (!count || count < 1) {
      return {
        status: "error",
        message:
          "Prima di aprire la fase Commenti devi assegnare almeno un esperto alla consultazione.",
      };
    }
  }

  const consultationsTable = supabase.from(
    "consultations",
  ) as unknown as ConsultationsUpdateBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const updateQuery = consultationsTable
    .update({
      title,
      description,
      current_state: currentState,
      document_title: documentTitle,
      document_description: documentDescription,
      is_active: isActive,
    })
    .eq("id", consultationId)
    .select("id, current_state")
    .single() as unknown as Promise<{
    data: { id: string; current_state: ConsultationState } | null;
    error: AppError | null;
  }>;
  const { data, error } = await updateQuery;

  if (error || !data) {
    return {
      status: "error",
      message:
        getConstraintErrorMessage(error) ??
        error?.message ??
        "Impossibile aggiornare la consultazione.",
    };
  }

  if (data.current_state !== currentState) {
    return {
      status: "error",
      message:
        "La consultazione non ha mantenuto la fase selezionata. Riprova o verifica i vincoli del database.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "consultation_updated",
    target_table: "consultations",
    target_id: consultationId,
    metadata: {
      title,
      current_state: currentState,
      is_active: String(isActive),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));
  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Consultazione aggiornata.",
  };
}

export async function updateConsultationParticipantsAction(
  _previousState: UpdateConsultationParticipantsFormState,
  formData: FormData,
): Promise<UpdateConsultationParticipantsFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono assegnare esperti.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const selectedProfileIds = normalizeStringArray(formData.getAll("participantProfileIds"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const participantsTable = supabase.from(
    "consultation_participants",
  ) as unknown as ConsultationParticipantsInsertBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const existingParticipantsQuery = supabase
    .from("consultation_participants")
    .select("id, profile_id, is_active")
    .eq("consultation_id", consultationId) as unknown as Promise<{
    data: { id: string; profile_id: string; is_active: boolean }[] | null;
    error: AppError | null;
  }>;
  const expertProfilesPromise =
    selectedProfileIds.length > 0
      ? ((supabase
          .from("profiles")
          .select("id")
          .eq("role", "expert")
          .in("id", selectedProfileIds)) as unknown as Promise<{
          data: { id: string }[] | null;
          error: AppError | null;
        }>)
      : Promise.resolve({
          data: [] as { id: string }[],
          error: null,
        });
  const [
    { data: existingParticipants, error: existingParticipantsError },
    { data: expertProfiles, error: expertProfilesError },
  ] = await Promise.all([existingParticipantsQuery, expertProfilesPromise]);

  if (existingParticipantsError) {
    return {
      status: "error",
      message:
        existingParticipantsError.message ||
        "Impossibile leggere i partecipanti attuali della consultazione.",
    };
  }

  if (expertProfilesError) {
    return {
      status: "error",
      message:
        expertProfilesError.message || "Impossibile verificare gli esperti selezionati.",
    };
  }

  const validSelectedProfileIds = new Set((expertProfiles ?? []).map((expert) => expert.id));
  const currentActiveParticipantIds = new Set(
    (existingParticipants ?? [])
      .filter((participant) => participant.is_active)
      .map((participant) => participant.profile_id),
  );
  const participantIdsToInsert = Array.from(validSelectedProfileIds).filter(
    (profileId) => !currentActiveParticipantIds.has(profileId),
  );
  const participantIdsToDelete = (existingParticipants ?? [])
    .filter(
      (participant) =>
        !validSelectedProfileIds.has(participant.profile_id) || !participant.is_active,
    )
    .map((participant) => participant.profile_id);

  if (participantIdsToDelete.length > 0) {
    const { error } = await participantsTable
      .delete()
      .eq("consultation_id", consultationId)
      .in("profile_id", participantIdsToDelete);

    if (error) {
      return {
        status: "error",
        message:
          error.message || "Impossibile aggiornare i partecipanti della consultazione.",
      };
    }
  }

  if (participantIdsToInsert.length > 0) {
    const { error } = await participantsTable.insert(
      participantIdsToInsert.map((profileId) => ({
        consultation_id: consultationId,
        profile_id: profileId,
        is_active: true,
      })),
    );

    if (error) {
      return {
        status: "error",
        message:
          error.message || "Impossibile salvare i partecipanti della consultazione.",
      };
    }
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "consultation_participants_updated",
    target_table: "consultation_participants",
    target_id: consultationId,
    metadata: {
      assigned_count: String(validSelectedProfileIds.size),
      inserted_count: String(participantIdsToInsert.length),
      removed_count: String(participantIdsToDelete.length),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));

  return {
    status: "success",
    message:
      validSelectedProfileIds.size > 0
        ? "Esperti assegnati alla consultazione."
        : "Nessun esperto assegnato alla consultazione.",
  };
}

export async function deleteConsultationAction(
  _previousState: DeleteConsultationFormState,
  formData: FormData,
): Promise<DeleteConsultationFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono eliminare consultazioni.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const consultationsTable = supabase.from(
    "consultations",
  ) as unknown as ConsultationsUpdateBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const deleteQuery = consultationsTable.delete().eq("id", consultationId);
  const { error } = await deleteQuery;

  if (error) {
    return {
      status: "error",
      message: error.message || "Impossibile eliminare la consultazione.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "consultation_deleted",
    target_table: "consultations",
    target_id: consultationId,
    metadata: {},
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");

  return {
    status: "success",
    message: "Consultazione eliminata.",
  };
}

export async function createDocumentSectionAction(
  _previousState: CreateDocumentSectionFormState,
  formData: FormData,
): Promise<CreateDocumentSectionFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono creare sezioni.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const title = normalizeText(formData.get("title"));
  const providedSlug = normalizeText(formData.get("slug"));
  const orderIndex = normalizePositiveInteger(formData.get("orderIndex"));
  const referenceLabel = normalizeOptionalText(formData.get("referenceLabel"));
  const bodyText = normalizeOptionalText(formData.get("bodyText"));
  const isActive = normalizeBooleanValue(formData.get("isActive"));
  const slug = providedSlug || slugifySectionTitle(title);

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo della sezione e' obbligatorio.",
    };
  }

  if (!orderIndex) {
    return {
      status: "error",
      message: "Il numero d'ordine deve essere un intero positivo.",
    };
  }

  if (!slug) {
    return {
      status: "error",
      message: "Lo slug non e' valido. Inseriscilo manualmente o modifica il titolo.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const documentSectionsTable = supabase.from(
    "document_sections",
  ) as unknown as DocumentSectionsInsertBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const insertQuery = documentSectionsTable
    .insert({
      consultation_id: consultationId,
      title,
      slug,
      order_index: orderIndex,
      body_text: bodyText,
      reference_label: referenceLabel,
      is_active: isActive,
    })
    .select("id")
    .single() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await insertQuery;

  if (error || !data) {
    return {
      status: "error",
      message:
        getConstraintErrorMessage(error) ??
        error?.message ??
        "Impossibile creare la sezione.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "document_section_created",
    target_table: "document_sections",
    target_id: data.id,
    metadata: {
      title,
      slug,
      order_index: String(orderIndex),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));

  return {
    status: "success",
    message: "Sezione creata.",
    createdSectionId: data.id,
  };
}

export async function updateDocumentSectionAction(
  _previousState: UpdateDocumentSectionFormState,
  formData: FormData,
): Promise<UpdateDocumentSectionFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono modificare sezioni.",
    };
  }

  const sectionId = normalizeText(formData.get("sectionId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const title = normalizeText(formData.get("title"));
  const providedSlug = normalizeText(formData.get("slug"));
  const orderIndex = normalizePositiveInteger(formData.get("orderIndex"));
  const referenceLabel = normalizeOptionalText(formData.get("referenceLabel"));
  const bodyText = normalizeOptionalText(formData.get("bodyText"));
  const isActive = normalizeBooleanValue(formData.get("isActive"));
  const slug = providedSlug || slugifySectionTitle(title);

  if (!sectionId || !consultationId) {
    return {
      status: "error",
      message: "Sezione non valida.",
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo della sezione e' obbligatorio.",
    };
  }

  if (!orderIndex) {
    return {
      status: "error",
      message: "Il numero d'ordine deve essere un intero positivo.",
    };
  }

  if (!slug) {
    return {
      status: "error",
      message: "Lo slug non e' valido. Inseriscilo manualmente o modifica il titolo.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const documentSectionsTable = supabase.from(
    "document_sections",
  ) as unknown as DocumentSectionsUpdateBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const updateQuery = documentSectionsTable
    .update({
      title,
      slug,
      order_index: orderIndex,
      body_text: bodyText,
      reference_label: referenceLabel,
      is_active: isActive,
    })
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .select("id")
    .single() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await updateQuery;

  if (error || !data) {
    return {
      status: "error",
      message:
        getConstraintErrorMessage(error) ??
        error?.message ??
        "Impossibile aggiornare la sezione.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "document_section_updated",
    target_table: "document_sections",
    target_id: sectionId,
    metadata: {
      title,
      slug,
      order_index: String(orderIndex),
      is_active: String(isActive),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));

  return {
    status: "success",
    message: "Sezione aggiornata.",
  };
}

export async function deleteDocumentSectionAction(
  _previousState: DeleteDocumentSectionFormState,
  formData: FormData,
): Promise<DeleteDocumentSectionFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono eliminare sezioni.",
    };
  }

  const sectionId = normalizeText(formData.get("sectionId"));
  const consultationId = normalizeText(formData.get("consultationId"));

  if (!sectionId || !consultationId) {
    return {
      status: "error",
      message: "Sezione non valida.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const documentSectionsTable = supabase.from(
    "document_sections",
  ) as unknown as DocumentSectionsUpdateBuilder;
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const deleteQuery = documentSectionsTable
    .delete()
    .eq("id", sectionId)
    .eq("consultation_id", consultationId) as unknown as Promise<{
    error: AppError | null;
  }>;
  const { error } = await deleteQuery;

  if (error) {
    return {
      status: "error",
      message: error.message || "Impossibile eliminare la sezione.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "document_section_deleted",
    target_table: "document_sections",
    target_id: sectionId,
    metadata: {},
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));

  return {
    status: "success",
    message: "Sezione eliminata.",
  };
}

export async function updateAdminConsultationCommentAction(
  _previousState: UpdateAdminConsultationCommentFormState,
  formData: FormData,
): Promise<UpdateAdminConsultationCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono modificare commenti.",
      notificationContext: null,
    };
  }

  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));
  const title = normalizeText(formData.get("title"));
  const bodyText = normalizeOptionalText(formData.get("bodyText"));
  const priority = normalizeCommentPriority(formData.get("priority"));

  if (!commentId) {
    return {
      status: "error",
      message: "Commento non valido.",
      notificationContext: null,
    };
  }

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
      notificationContext: null,
    };
  }

  if (!sectionId) {
    return {
      status: "error",
      message: "Sezione non valida.",
      notificationContext: null,
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo del commento e' obbligatorio.",
      notificationContext: null,
    };
  }

  if (!priority) {
    return {
      status: "error",
      message: "Seleziona una priorita' valida: low, medium o high.",
      notificationContext: null,
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, title")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; title: string }>() as unknown as Promise<{
    data: { id: string; title: string } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id, title")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{ id: string; title: string }>() as unknown as Promise<{
    data: { id: string; title: string } | null;
    error: AppError | null;
  }>;
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, expert_profile_id, title, body_text, is_active")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .maybeSingle<{ id: string; expert_profile_id: string; title: string; body_text: string | null; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; expert_profile_id: string; title: string; body_text: string | null; is_active: boolean } | null;
    error: AppError | null;
  }>;

  const [
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
    { data: comment, error: commentError },
  ] = await Promise.all([consultationQuery, sectionQuery, commentQuery]);

  if (consultationError || !consultation) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
      notificationContext: null,
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message: sectionError?.message || "La sezione selezionata non e' disponibile.",
      notificationContext: null,
    };
  }

  if (commentError || !comment || !comment.is_active) {
    return {
      status: "error",
      message: commentError?.message || "Il commento selezionato non e' disponibile.",
      notificationContext: null,
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsUpdateBuilder;
  const updateQuery = commentsTable
    .update({
      title,
      body_text: bodyText,
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .select("id")
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await updateQuery;

  if (error || !data) {
    return {
      status: "error",
      message: error?.message || "Impossibile aggiornare il commento.",
      notificationContext: null,
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "expert_section_comment_updated",
    target_table: "expert_section_comments",
    target_id: commentId,
    metadata: {
      expert_profile_id: comment.expert_profile_id,
      priority,
      section_id: sectionId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));
  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento aggiornato correttamente.",
    notificationContext: {
      actionType: "updated",
      commentId,
      consultationId,
      nextComment: {
        bodyText,
        title,
      },
      previousComment: {
        bodyText: comment.body_text,
        title: comment.title,
      },
      sectionId,
    },
  };
}

export async function createAdminConsultationCommentAction(
  _previousState: CreateAdminConsultationCommentFormState,
  formData: FormData,
): Promise<CreateAdminConsultationCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono creare commenti.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));
  const expertProfileId = normalizeText(formData.get("expertProfileId"));
  const title = normalizeText(formData.get("title"));
  const bodyText = normalizeOptionalText(formData.get("bodyText"));
  const priority = normalizeCommentPriority(formData.get("priority"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!sectionId) {
    return {
      status: "error",
      message: "Seleziona una sezione prima di creare un commento.",
    };
  }

  if (!expertProfileId) {
    return {
      status: "error",
      message: "Seleziona l'esperto autore del commento.",
    };
  }

  if (!title) {
    return {
      status: "error",
      message: "Il titolo del commento e' obbligatorio.",
    };
  }

  if (!priority) {
    return {
      status: "error",
      message: "Seleziona una priorita' valida: low, medium o high.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, current_state, is_active")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; current_state: ConsultationState; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; current_state: ConsultationState; is_active: boolean } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const assignmentQuery = supabase
    .from("consultation_participants")
    .select("profile_id")
    .eq("consultation_id", consultationId)
    .eq("profile_id", expertProfileId)
    .eq("is_active", true)
    .maybeSingle<{ profile_id: string }>() as unknown as Promise<{
    data: { profile_id: string } | null;
    error: AppError | null;
  }>;
  const expertQuery = supabase
    .from("profiles")
    .select("id")
    .eq("id", expertProfileId)
    .eq("role", "expert")
    .eq("is_active", true)
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const [
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
    { data: assignment, error: assignmentError },
    { data: expert, error: expertError },
  ] = await Promise.all([consultationQuery, sectionQuery, assignmentQuery, expertQuery]);

  if (consultationError || !consultation || !consultation.is_active) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (consultation.current_state !== "admin_review") {
    return {
      status: "error",
      message:
        "Gli amministratori possono creare nuovi commenti solo nella fase Accorpamento commenti.",
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message: sectionError?.message || "La sezione selezionata non e' disponibile.",
    };
  }

  if (expertError || !expert || assignmentError || !assignment) {
    return {
      status: "error",
      message:
        expertError?.message ||
        assignmentError?.message ||
        "L'esperto selezionato non e' attivo o non e' assegnato alla consultazione.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsInsertBuilder;
  const insertQuery = commentsTable
    .insert({
      consultation_id: consultationId,
      section_id: sectionId,
      expert_profile_id: expertProfileId,
      title,
      body_text: bodyText,
      priority,
      is_active: true,
    })
    .select("id")
    .single<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await insertQuery;

  if (error || !data) {
    return {
      status: "error",
      message: error?.message || "Impossibile creare il commento.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "expert_section_comment_created_by_admin",
    target_table: "expert_section_comments",
    target_id: data.id,
    metadata: {
      expert_profile_id: expertProfileId,
      priority,
      section_id: sectionId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));
  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento creato correttamente.",
    createdCommentId: data.id,
  };
}

export async function deleteAdminConsultationCommentAction(
  _previousState: UpdateAdminConsultationCommentFormState,
  formData: FormData,
): Promise<UpdateAdminConsultationCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono eliminare commenti.",
      notificationContext: null,
    };
  }

  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));

  if (!commentId) {
    return {
      status: "error",
      message: "Commento non valido.",
      notificationContext: null,
    };
  }

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
      notificationContext: null,
    };
  }

  if (!sectionId) {
    return {
      status: "error",
      message: "Sezione non valida.",
      notificationContext: null,
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, title")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; title: string }>() as unknown as Promise<{
    data: { id: string; title: string } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id, title")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{ id: string; title: string }>() as unknown as Promise<{
    data: { id: string; title: string } | null;
    error: AppError | null;
  }>;
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, expert_profile_id, title, body_text, is_active")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .maybeSingle<{ id: string; expert_profile_id: string; title: string; body_text: string | null; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; expert_profile_id: string; title: string; body_text: string | null; is_active: boolean } | null;
    error: AppError | null;
  }>;

  const [
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
    { data: comment, error: commentError },
  ] = await Promise.all([consultationQuery, sectionQuery, commentQuery]);

  if (consultationError || !consultation) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
      notificationContext: null,
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message: sectionError?.message || "La sezione selezionata non e' disponibile.",
      notificationContext: null,
    };
  }

  if (commentError || !comment || !comment.is_active) {
    return {
      status: "error",
      message: commentError?.message || "Il commento selezionato non e' disponibile.",
      notificationContext: null,
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsSoftDeleteBuilder;
  const deleteQuery = commentsTable
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .select("id")
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await deleteQuery;

  if (error || !data) {
    return {
      status: "error",
      message: error?.message || "Impossibile eliminare il commento.",
      notificationContext: null,
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "expert_section_comment_deleted",
    target_table: "expert_section_comments",
    target_id: commentId,
    metadata: {
      expert_profile_id: comment.expert_profile_id,
      section_id: sectionId,
    },
  });

  return {
    status: "success",
    message: "Commento eliminato correttamente.",
    notificationContext: {
      actionType: "deleted",
      commentId,
      consultationId,
      nextComment: null,
      previousComment: {
        bodyText: comment.body_text,
        title: comment.title,
      },
      sectionId,
    },
  };
}

export async function toggleAdminConsultationCommentPhase2ReviewAction(
  _previousState: ToggleAdminConsultationCommentPhase2ReviewFormState,
  formData: FormData,
): Promise<ToggleAdminConsultationCommentPhase2ReviewFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono segnare i commenti lavorati.",
    };
  }

  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const isPhase2Reviewed = normalizeStrictBooleanValue(formData.get("isPhase2Reviewed"));

  if (!commentId) {
    return {
      status: "error",
      message: "Commento non valido.",
    };
  }

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (isPhase2Reviewed === null) {
    return {
      status: "error",
      message: "Valore del checkbox non valido.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, current_state")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; current_state: ConsultationState }>() as unknown as Promise<{
    data: { id: string; current_state: ConsultationState } | null;
    error: AppError | null;
  }>;
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, expert_profile_id, section_id, is_active")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{
      id: string;
      expert_profile_id: string;
      section_id: string;
      is_active: boolean;
    }>() as unknown as Promise<{
    data: {
      id: string;
      expert_profile_id: string;
      section_id: string;
      is_active: boolean;
    } | null;
    error: AppError | null;
  }>;
  const [
    { data: consultation, error: consultationError },
    { data: comment, error: commentError },
  ] = await Promise.all([consultationQuery, commentQuery]);

  if (consultationError || !consultation) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (
    consultation.current_state !== "phase_2_open"
    && consultation.current_state !== "phase_2_closed"
    && consultation.current_state !== "completed"
  ) {
    return {
      status: "error",
      message: "Questo checkbox e' disponibile solo durante la fase di votazione commenti.",
    };
  }

  if (commentError || !comment || !comment.is_active) {
    return {
      status: "error",
      message: commentError?.message || "Il commento selezionato non e' disponibile.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsPhase2ReviewBuilder;
  const updateQuery = commentsTable
    .update({
      is_phase_2_reviewed: isPhase2Reviewed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .select("id")
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await updateQuery;

  if (error || !data) {
    return {
      status: "error",
      message: isMissingColumnError(error, "expert_section_comments", "is_phase_2_reviewed")
        ? "Il database non e' ancora pronto per salvare questo flag. Applica prima la nuova migrazione."
        : error?.message || "Impossibile aggiornare lo stato di lavorazione del commento.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: isPhase2Reviewed
      ? "expert_section_comment_phase_2_reviewed"
      : "expert_section_comment_phase_2_unreviewed",
    target_table: "expert_section_comments",
    target_id: commentId,
    metadata: {
      expert_profile_id: comment.expert_profile_id,
      section_id: comment.section_id,
      is_phase_2_reviewed: String(isPhase2Reviewed),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));

  return {
    status: "success",
    message: isPhase2Reviewed
      ? "Commento segnato come gia' integrato."
      : "Commento riaperto tra quelli da lavorare.",
  };
}

export async function reorderAdminConsultationCommentsAction(
  formData: FormData,
): Promise<ReorderAdminConsultationCommentsFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono riordinare i commenti.",
    };
  }

  const consultationId = normalizeText(formData.get("consultationId"));
  const sectionId = normalizeText(formData.get("sectionId"));
  const orderedCommentIds = normalizeStringArray(formData.getAll("commentIds"));

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  if (!sectionId) {
    return {
      status: "error",
      message: "Sezione non valida.",
    };
  }

  if (orderedCommentIds.length < 2) {
    return {
      status: "success",
      message: "Ordine gia' aggiornato.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, current_state, is_active")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; current_state: ConsultationState; is_active: boolean }>() as unknown as Promise<{
    data: { id: string; current_state: ConsultationState; is_active: boolean } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const commentsQuery = supabase
    .from("expert_section_comments")
    .select("id")
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .eq("is_active", true)
    .returns<{ id: string }[]>() as unknown as Promise<{
    data: { id: string }[] | null;
    error: AppError | null;
  }>;
  const [
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
    { data: existingComments, error: commentsError },
  ] = await Promise.all([consultationQuery, sectionQuery, commentsQuery]);

  if (consultationError || !consultation || !consultation.is_active) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (consultation.current_state !== "admin_review") {
    return {
      status: "error",
      message: "I commenti possono essere riordinati solo nella fase Accorpamento commenti.",
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message: sectionError?.message || "La sezione selezionata non e' disponibile.",
    };
  }

  if (commentsError) {
    return {
      status: "error",
      message: commentsError.message || "Impossibile leggere i commenti della sezione.",
    };
  }

  const existingCommentIds = new Set((existingComments ?? []).map((comment) => comment.id));
  const orderedCommentIdSet = new Set(orderedCommentIds);
  const containsSameComments =
    existingCommentIds.size === orderedCommentIdSet.size
    && orderedCommentIds.every((commentId) => existingCommentIds.has(commentId));

  if (!containsSameComments) {
    return {
      status: "error",
      message: "La lista dei commenti non e' aggiornata. Ricarica la pagina e riprova.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsReorderBuilder;
  const updateResults = await Promise.all(
    orderedCommentIds.map((commentId, index) =>
      commentsTable
        .update({
          display_order: index + 1,
        })
        .eq("id", commentId)
        .eq("consultation_id", consultationId)
        .eq("section_id", sectionId)
        .select("id")
        .maybeSingle<{ id: string }>(),
    ),
  );
  const failedUpdate = updateResults.find((result) => result.error || !result.data);

  if (failedUpdate) {
    return {
      status: "error",
      message: isMissingColumnError(
        failedUpdate.error,
        "expert_section_comments",
        "display_order",
      )
        ? "Il database non e' ancora pronto per salvare l'ordine. Applica prima la nuova migrazione."
        : failedUpdate.error?.message || "Impossibile salvare il nuovo ordine dei commenti.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "expert_section_comments_reordered",
    target_table: "expert_section_comments",
    target_id: sectionId,
    metadata: {
      section_id: sectionId,
      comment_count: String(orderedCommentIds.length),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));
  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Ordine dei commenti aggiornato.",
  };
}

export async function restoreAdminConsultationCommentAction(
  _previousState: RestoreAdminConsultationCommentFormState,
  formData: FormData,
): Promise<RestoreAdminConsultationCommentFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono ripristinare commenti.",
    };
  }

  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));

  if (!commentId) {
    return {
      status: "error",
      message: "Commento non valido.",
    };
  }

  if (!consultationId) {
    return {
      status: "error",
      message: "Consultazione non valida.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id")
    .eq("id", consultationId)
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, expert_profile_id, section_id, is_active")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{
      id: string;
      expert_profile_id: string;
      is_active: boolean;
      section_id: string;
    }>() as unknown as Promise<{
    data: {
      id: string;
      expert_profile_id: string;
      is_active: boolean;
      section_id: string;
    } | null;
    error: AppError | null;
  }>;
  const [
    { data: consultation, error: consultationError },
    { data: comment, error: commentError },
  ] = await Promise.all([consultationQuery, commentQuery]);

  if (consultationError || !consultation) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (commentError || !comment || comment.is_active) {
    return {
      status: "error",
      message:
        commentError?.message || "Il commento selezionato non e' disponibile per il ripristino.",
    };
  }

  const commentsTable = supabase.from(
    "expert_section_comments",
  ) as unknown as ExpertSectionCommentsSoftDeleteBuilder;
  const restoreQuery = commentsTable
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .eq("section_id", comment.section_id)
    .select("id")
    .maybeSingle<{ id: string }>() as unknown as Promise<{
    data: { id: string } | null;
    error: AppError | null;
  }>;
  const { data, error } = await restoreQuery;

  if (error || !data) {
    return {
      status: "error",
      message: error?.message || "Impossibile ripristinare il commento.",
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "expert_section_comment_restored",
    target_table: "expert_section_comments",
    target_id: commentId,
    metadata: {
      expert_profile_id: comment.expert_profile_id,
      section_id: comment.section_id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath(getConsultationDetailPath(consultationId));
  revalidatePath(getDeletedCommentsPath(consultationId));
  revalidatePath("/app");
  revalidatePath(getExpertConsultationPath(consultationId));

  return {
    status: "success",
    message: "Commento ripristinato correttamente.",
  };
}

export async function notifyAdminCommentAuthorAction(
  _previousState: SendAdminCommentNotificationFormState,
  formData: FormData,
): Promise<SendAdminCommentNotificationFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      status: "error",
      message: "Solo gli amministratori autenticati possono inviare notifiche.",
    };
  }

  const actionType = normalizeCommentNotificationActionType(
    formData.get("actionType"),
  );
  const commentId = normalizeText(formData.get("commentId"));
  const consultationId = normalizeText(formData.get("consultationId"));
  const nextBodyText = normalizeOptionalText(formData.get("nextBodyText"));
  const nextTitle = normalizeText(formData.get("nextTitle"));
  const previousBodyText = normalizeOptionalText(formData.get("previousBodyText"));
  const previousTitle = normalizeText(formData.get("previousTitle"));
  const sectionId = normalizeText(formData.get("sectionId"));
  const notificationMessage = normalizeNotificationMessage(
    formData.get("notificationMessage"),
  );

  if (!actionType) {
    return {
      status: "error",
      message: "Azione di notifica non valida.",
    };
  }

  if (!commentId || !consultationId || !sectionId) {
    return {
      status: "error",
      message: "Dati del commento non validi per inviare la notifica.",
    };
  }

  if (!previousTitle) {
    return {
      status: "error",
      message: "Versione originale del commento non disponibile.",
    };
  }

  if (actionType === "updated" && !nextTitle) {
    return {
      status: "error",
      message: "Versione aggiornata del commento non disponibile.",
    };
  }

  if (!notificationMessage) {
    return {
      status: "error",
      message: "Scrivi un messaggio prima di inviare la notifica all'autore.",
    };
  }

  if (!hasSmtpNotificationEnv()) {
    return {
      status: "error",
      message:
        "Le variabili SMTP non sono configurate. Aggiungi SMTP_PASS e, se necessario, SMTP_USER per inviare notifiche email.",
    };
  }

  const supabase = createAdminSupabaseClient();
  const adminActionLogsTable = supabase.from(
    "admin_action_logs",
  ) as unknown as AdminActionLogsInsertBuilder;
  const consultationQuery = supabase
    .from("consultations")
    .select("id, title")
    .eq("id", consultationId)
    .maybeSingle<{ id: string; title: string }>() as unknown as Promise<{
    data: { id: string; title: string } | null;
    error: AppError | null;
  }>;
  const sectionQuery = supabase
    .from("document_sections")
    .select("id, title")
    .eq("id", sectionId)
    .eq("consultation_id", consultationId)
    .maybeSingle<{ id: string; title: string }>() as unknown as Promise<{
    data: { id: string; title: string } | null;
    error: AppError | null;
  }>;
  const commentQuery = supabase
    .from("expert_section_comments")
    .select("id, expert_profile_id, title")
    .eq("id", commentId)
    .eq("consultation_id", consultationId)
    .eq("section_id", sectionId)
    .maybeSingle<{ id: string; expert_profile_id: string; title: string }>() as unknown as Promise<{
    data: { id: string; expert_profile_id: string; title: string } | null;
    error: AppError | null;
  }>;

  const [
    { data: consultation, error: consultationError },
    { data: section, error: sectionError },
    { data: comment, error: commentError },
  ] = await Promise.all([consultationQuery, sectionQuery, commentQuery]);

  if (consultationError || !consultation) {
    return {
      status: "error",
      message: consultationError?.message || "Consultazione non disponibile.",
    };
  }

  if (sectionError || !section) {
    return {
      status: "error",
      message: sectionError?.message || "La sezione selezionata non e' disponibile.",
    };
  }

  if (commentError || !comment) {
    return {
      status: "error",
      message: commentError?.message || "Il commento selezionato non e' disponibile.",
    };
  }

  const authorLookupQuery = supabase
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", comment.expert_profile_id)
    .maybeSingle<{ email: string; first_name: string; last_name: string }>() as unknown as Promise<{
    data: { email: string; first_name: string; last_name: string } | null;
    error: AppError | null;
  }>;
  const { data: author, error: authorError } = await authorLookupQuery;

  if (authorError || !author) {
    return {
      status: "error",
      message: authorError?.message || "Impossibile recuperare l'autore del commento.",
    };
  }

  const notificationError = await maybeSendCommentAuthorNotification({
    actionType,
    commentTitle: comment.title,
    consultationTitle: consultation.title,
    nextComment:
      actionType === "updated"
        ? {
          bodyText: nextBodyText,
          title: nextTitle,
        }
        : null,
    previousComment: {
      bodyText: previousBodyText,
      title: previousTitle,
    },
    recipientEmail: author.email,
    recipientName: `${author.first_name} ${author.last_name}`.trim() || author.email,
    sectionTitle: section.title,
    shouldNotifyAuthor: true,
    notificationMessage,
  });

  if (notificationError) {
    return {
      status: "error",
      message: `Invio della notifica email non riuscito: ${notificationError}`,
    };
  }

  await logAdminAction(adminActionLogsTable, {
    admin_profile_id: profile.id,
    consultation_id: consultationId,
    action_type: "expert_section_comment_author_notified",
    target_table: "expert_section_comments",
    target_id: commentId,
    metadata: {
      action_type: actionType,
      expert_profile_id: comment.expert_profile_id,
      section_id: sectionId,
    },
  });

  return {
    status: "success",
    message:
      actionType === "deleted"
        ? "Notifica inviata all'autore del commento eliminato."
        : "Notifica inviata all'autore del commento modificato.",
  };
}
