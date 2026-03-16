"use client";

import { useActionState } from "react";
import {
  resendAdminInviteAction,
  type ResendAdminInviteFormState,
} from "@/features/admin/admins/actions";

type ResendAdminInviteButtonProps = {
  profileId: string;
  compact?: boolean;
};

const initialState: ResendAdminInviteFormState = {
  status: "idle",
  message: "",
};

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="14"
      viewBox="0 0 24 24"
      width="14"
    >
      <path
        d="M4 6.75h16a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75H4a.75.75 0 0 1-.75-.75v-9A.75.75 0 0 1 4 6.75Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m4 8 8 5 8-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ResendAdminInviteButton({
  profileId,
  compact = false,
}: ResendAdminInviteButtonProps) {
  const [state, formAction, isPending] = useActionState(
    resendAdminInviteAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className={compact ? "inline-action-form table-inline-action-form" : "inline-action-form"}
    >
      <input name="profileId" type="hidden" value={profileId} />
      <button
        aria-label="Reinvia email di accesso"
        className={compact ? "secondary-button small-button icon-action-button" : "secondary-button small-button"}
        disabled={isPending}
        title="Reinvia email di accesso"
        type="submit"
      >
        {compact ? (
          <>
            <MailIcon />
            <span className="sr-only">
              {isPending ? "Invio email..." : "Reinvia email di accesso"}
            </span>
          </>
        ) : isPending ? (
          "Invio email..."
        ) : (
          "Reinvia email di accesso"
        )}
      </button>
      {state.status !== "idle" && state.message ? (
        <p className={state.status === "error" ? "form-error compact-message" : "muted compact-message"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
