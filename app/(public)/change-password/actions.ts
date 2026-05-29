"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ChangePasswordActionResult = {
  status: "success" | "error";
  message?: string;
};

export async function updateCurrentUserPassword(
  password: string,
  confirmPassword: string,
): Promise<ChangePasswordActionResult> {
  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Le password non coincidono.",
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "La password deve contenere almeno 8 caratteri.",
    };
  }

  const { user, profile } = await getAuthContext();

  if (!user || !profile || !profile.is_active) {
    return {
      status: "error",
      message:
        "La sessione non e' valida. Accedi di nuovo dal link ricevuto via email.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  if (updateError) {
    return {
      status: "error",
      message: updateError.message || "Impossibile aggiornare la password.",
    };
  }

  if (profile.must_reset_password) {
    const { error: rpcError } = await supabase.rpc("mark_password_reset_complete");

    if (rpcError) {
      return {
        status: "error",
        message:
          rpcError.message ||
          "Password aggiornata, ma non e' stato possibile completare il primo accesso.",
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/change-password");

  return {
    status: "success",
  };
}
