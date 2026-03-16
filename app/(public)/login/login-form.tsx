"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppUrl } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Impossibile effettuare l'accesso.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordRecovery() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        "Inserisci il tuo indirizzo email e poi usa il recupero password.",
      );
      setSuccessMessage(null);
      return;
    }

    setIsRecoveringPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${getAppUrl()}/auth/confirm?next=/change-password?mode=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo,
        },
      );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Se l'email e' registrata, riceverai a breve un link per reimpostare la password.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossibile avviare il recupero password.",
      );
    } finally {
      setIsRecoveringPassword(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="expert@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>Password</span>
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>

      <div className="login-form-secondary-actions">
        <button
          className="inline-link-button"
          disabled={isSubmitting || isRecoveringPassword}
          onClick={handlePasswordRecovery}
          type="button"
        >
          {isRecoveringPassword
            ? "Invio link di recupero..."
            : "Password dimenticata?"}
        </button>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {successMessage ? <p className="form-success">{successMessage}</p> : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Accesso in corso..." : "Accedi"}
      </button>
    </form>
  );
}
