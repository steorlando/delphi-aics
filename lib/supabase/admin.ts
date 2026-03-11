import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";

type Database = Record<string, never>;

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

export function createAdminSupabaseClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}
