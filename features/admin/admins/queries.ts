import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminDirectoryEntry = {
  id: string;
  first_name: string;
  last_name: string;
  institution_name: string | null;
  email: string;
  must_reset_password: boolean;
  is_active: boolean;
  created_at: string;
};

type AppError = {
  message: string;
};

export async function getAdminsDirectory() {
  const supabase = await createServerSupabaseClient();
  const query = supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, institution_name, email, must_reset_password, is_active, created_at",
    )
    .eq("role", "admin")
    .order("created_at", { ascending: false })
    .returns<AdminDirectoryEntry[]>() as unknown as Promise<{
    data: AdminDirectoryEntry[] | null;
    error: AppError | null;
  }>;
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}
