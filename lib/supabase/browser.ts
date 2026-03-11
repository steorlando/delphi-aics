"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

type Database = Record<string, never>;

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
    );
  }

  return browserClient;
}
