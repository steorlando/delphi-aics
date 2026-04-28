import { getAppUrl } from "@/lib/env";

type AuthEmailLinkInput = {
  next?: string;
  tokenHash: string;
  type: string;
};

export function buildAuthConfirmUrl(input: AuthEmailLinkInput) {
  const url = new URL("/auth/confirm", getAppUrl());

  url.searchParams.set("token_hash", input.tokenHash);
  url.searchParams.set("type", input.type);
  url.searchParams.set("next", input.next ?? "/change-password");

  return url.toString();
}
