"use server";

import { revalidatePath } from "next/cache";
import {
  buildStoredFigurePath,
  consultationFigureAllowedMimeTypes,
  consultationFigureMaxBytes,
  type StoredFigureEntry,
} from "@/features/admin/figures/shared";
import { ensureConsultationFiguresBucket } from "@/features/admin/figures/queries";
import { getAuthContext } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AppError = {
  message: string;
};

type AdminActionLogsInsertBuilder = {
  insert(values: {
    action_type: string;
    admin_profile_id: string;
    consultation_id?: string | null;
    metadata: Record<string, string>;
    target_id: string;
    target_table: string;
  }): Promise<{
    error: AppError | null;
  }>;
};

export type UploadFigureFormState = {
  figure?: StoredFigureEntry;
  message: string;
  status: "idle" | "success" | "error";
};

export type DeleteFigureFormState = {
  deletedPath?: string;
  message: string;
  status: "idle" | "success" | "error";
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function logAdminAction(values: {
  action_type: string;
  admin_profile_id: string;
  metadata: Record<string, string>;
  target_id: string;
  target_table: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminActionLogsTable = supabase.from(
      "admin_action_logs",
    ) as unknown as AdminActionLogsInsertBuilder;
    const { error } = await adminActionLogsTable.insert(values);

    if (error) {
      console.error("Unable to write admin action log", error);
    }
  } catch (error) {
    console.error("Unable to initialize admin action log client", error);
  }
}

function buildStoredFigureRecord(path: string, file: File, publicUrl: string): StoredFigureEntry {
  const now = new Date().toISOString();

  return {
    created_at: now,
    mime_type: file.type || null,
    name: path,
    path,
    public_url: publicUrl,
    size_bytes: file.size || null,
    updated_at: now,
  };
}

export async function uploadConsultationFigureAction(
  _previousState: UploadFigureFormState,
  formData: FormData,
): Promise<UploadFigureFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      message: "Solo gli amministratori autenticati possono caricare figure.",
      status: "error",
    };
  }

  const label = normalizeText(formData.get("label"));
  const fileEntry = formData.get("figureFile");

  if (!(fileEntry instanceof File) || !fileEntry.name) {
    return {
      message: "Seleziona un'immagine da caricare.",
      status: "error",
    };
  }

  if (!consultationFigureAllowedMimeTypes.includes(fileEntry.type as never)) {
    return {
      message:
        "Formato non supportato. Carica PNG, JPG, WEBP, GIF o SVG.",
      status: "error",
    };
  }

  if (fileEntry.size > consultationFigureMaxBytes) {
    return {
      message: "Il file supera la dimensione massima consentita di 8 MB.",
      status: "error",
    };
  }

  try {
    const { bucketName } = await ensureConsultationFiguresBucket();
    const supabase = createAdminSupabaseClient();
    const path = buildStoredFigurePath(fileEntry.name, label);
    const fileBytes = new Uint8Array(await fileEntry.arrayBuffer());
    const { error } = await supabase.storage.from(bucketName).upload(path, fileBytes, {
      contentType: fileEntry.type,
      upsert: false,
    });

    if (error) {
      return {
        message: error.message || "Impossibile caricare la figura su storage.",
        status: "error",
      };
    }

    const publicUrl = supabase.storage.from(bucketName).getPublicUrl(path).data.publicUrl;
    const figure = buildStoredFigureRecord(path, fileEntry, publicUrl);

    await logAdminAction({
      action_type: "consultation_figure_uploaded",
      admin_profile_id: profile.id,
      metadata: {
        content_type: fileEntry.type,
        path,
        size_bytes: String(fileEntry.size),
      },
      target_id: path,
      target_table: "storage.objects",
    });

    revalidatePath("/admin/figures");

    return {
      figure,
      message: "Figura caricata. Ora puoi copiare l'URL o lo snippet HTML.",
      status: "success",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Impossibile caricare la figura.",
      status: "error",
    };
  }
}

export async function deleteConsultationFigureAction(
  _previousState: DeleteFigureFormState,
  formData: FormData,
): Promise<DeleteFigureFormState> {
  const { profile } = await getAuthContext();

  if (!profile || !profile.is_active || profile.role !== "admin") {
    return {
      message: "Solo gli amministratori autenticati possono eliminare figure.",
      status: "error",
    };
  }

  const figurePath = normalizeText(formData.get("figurePath"));

  if (!figurePath) {
    return {
      message: "Figura non valida.",
      status: "error",
    };
  }

  try {
    const { bucketName } = await ensureConsultationFiguresBucket();
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.storage.from(bucketName).remove([figurePath]);

    if (error) {
      return {
        message: error.message || "Impossibile eliminare la figura.",
        status: "error",
      };
    }

    await logAdminAction({
      action_type: "consultation_figure_deleted",
      admin_profile_id: profile.id,
      metadata: {
        path: figurePath,
      },
      target_id: figurePath,
      target_table: "storage.objects",
    });

    revalidatePath("/admin/figures");

    return {
      deletedPath: figurePath,
      message: "Figura eliminata.",
      status: "success",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Impossibile eliminare la figura.",
      status: "error",
    };
  }
}
