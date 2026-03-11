"use client";

import { useActionState } from "react";
import {
  resendExpertInviteAction,
  type ResendInviteFormState,
} from "@/features/admin/experts/actions";

type ResendInviteButtonProps = {
  profileId: string;
};

const initialState: ResendInviteFormState = {
  status: "idle" as const,
  message: "",
};

export function ResendInviteButton({ profileId }: ResendInviteButtonProps) {
  const [state, formAction, isPending] = useActionState(
    resendExpertInviteAction,
    initialState,
  );

  return (
    <form action={formAction} className="inline-action-form">
      <input name="profileId" type="hidden" value={profileId} />
      <button className="secondary-button small-button" disabled={isPending} type="submit">
        {isPending ? "Invio..." : "Resend invite"}
      </button>
      {state.status !== "idle" && state.message ? (
        <p className={state.status === "error" ? "form-error compact-message" : "muted compact-message"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
