"use server";

import { revalidatePath } from "next/cache";
import {
  consultationStates,
  slugifySectionTitle,
  type ConsultationState,
} from "@/features/admin/consultations/shared";
import { getAuthContext } from "@/lib/auth/session";
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

function getConsultationDetailPath(consultationId: string) {
  return `/admin/consultations/${consultationId}`;
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
        "Impossibile aggiornare la consultazione.",
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

  return {
    status: "success",
    message: "Consultazione aggiornata.",
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
