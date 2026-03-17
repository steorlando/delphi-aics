import {
  consultationFigureAllowedMimeTypes,
  consultationFigureMaxBytes,
  consultationFiguresBucketName,
  type StoredFigureEntry,
} from "@/features/admin/figures/shared";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type StorageBucketEntry = {
  allowed_mime_types: string[] | null;
  file_size_limit: number | null;
  id: string;
  name: string;
  public: boolean;
};

type StorageFileEntry = {
  created_at?: string | null;
  id?: string | null;
  metadata?: {
    mimetype?: string | null;
    size?: number | null;
  } | null;
  name: string;
  updated_at?: string | null;
};

export type FigureLibraryState = {
  bucketName: string;
  bucketWasCreated: boolean;
  errorMessage: string | null;
  figures: StoredFigureEntry[];
};

function dedupeFiguresByPath(figures: StoredFigureEntry[]) {
  const figuresByPath = new Map<string, StoredFigureEntry>();

  for (const figure of figures) {
    figuresByPath.set(figure.path, figure);
  }

  return [...figuresByPath.values()];
}

export async function ensureConsultationFiguresBucket() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(error.message || "Impossibile leggere i bucket di storage.");
  }

  const existingBucket = (data as StorageBucketEntry[] | null)?.find(
    (bucket) =>
      bucket.id === consultationFiguresBucketName ||
      bucket.name === consultationFiguresBucketName,
  );

  if (!existingBucket) {
    const { error: createError } = await supabase.storage.createBucket(
      consultationFiguresBucketName,
      {
        allowedMimeTypes: [...consultationFigureAllowedMimeTypes],
        fileSizeLimit: consultationFigureMaxBytes,
        public: true,
      },
    );

    if (createError) {
      throw new Error(createError.message || "Impossibile creare il bucket figure.");
    }

    return {
      bucketName: consultationFiguresBucketName,
      bucketWasCreated: true,
    };
  }

  const sameMimeTypes =
    existingBucket.allowed_mime_types?.length ===
      consultationFigureAllowedMimeTypes.length &&
    consultationFigureAllowedMimeTypes.every((mimeType) =>
      existingBucket.allowed_mime_types?.includes(mimeType),
    );

  if (
    !existingBucket.public ||
    existingBucket.file_size_limit !== consultationFigureMaxBytes ||
    !sameMimeTypes
  ) {
    const { error: updateError } = await supabase.storage.updateBucket(
      consultationFiguresBucketName,
      {
        allowedMimeTypes: [...consultationFigureAllowedMimeTypes],
        fileSizeLimit: consultationFigureMaxBytes,
        public: true,
      },
    );

    if (updateError) {
      throw new Error(updateError.message || "Impossibile aggiornare il bucket figure.");
    }
  }

  return {
    bucketName: consultationFiguresBucketName,
    bucketWasCreated: false,
  };
}

export async function getFigureLibraryState(): Promise<FigureLibraryState> {
  try {
    const { bucketName, bucketWasCreated } = await ensureConsultationFiguresBucket();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.storage.from(bucketName).list("", {
      limit: 200,
      sortBy: {
        column: "created_at",
        order: "desc",
      },
    });

    if (error) {
      return {
        bucketName,
        bucketWasCreated,
        errorMessage: error.message || "Impossibile leggere le figure caricate.",
        figures: [],
      };
    }

    const figures = dedupeFiguresByPath(
      (data as StorageFileEntry[] | null)
      ?.filter((entry) => Boolean(entry.name) && Boolean(entry.id))
      .map((entry) => ({
        created_at: entry.created_at ?? null,
        mime_type: entry.metadata?.mimetype ?? null,
        name: entry.name,
        path: entry.name,
        public_url: supabase.storage.from(bucketName).getPublicUrl(entry.name).data
          .publicUrl,
        size_bytes:
          typeof entry.metadata?.size === "number" ? entry.metadata.size : null,
        updated_at: entry.updated_at ?? null,
      }))
      ?? [],
    );

    return {
      bucketName,
      bucketWasCreated,
      errorMessage: null,
      figures,
    };
  } catch (error) {
    return {
      bucketName: consultationFiguresBucketName,
      bucketWasCreated: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Impossibile preparare la libreria figure.",
      figures: [],
    };
  }
}
