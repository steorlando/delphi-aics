"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type ChangePasswordFormProps = {
  email: string;
};

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Le password non coincidono.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      const { error: rpcError } = await supabase.rpc(
        "mark_password_reset_complete",
      );

      if (rpcError) {
        throw rpcError;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossibile aggiornare la password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p className="muted">Accesso effettuato come {email}</p>

      <label className="field">
        <span>Nuova password</span>
        <input
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <label className="field">
        <span>Conferma nuova password</span>
        <input
          autoComplete="new-password"
          minLength={8}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Aggiornamento in corso..." : "Salva nuova password"}
      </button>
    </form>
  );
}
