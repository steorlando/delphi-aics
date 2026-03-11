import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import type { AppProfile, AppRole } from "@/lib/auth/types";

export function getRoleHome(role: AppRole) {
  return role === "admin" ? "/admin" : "/app";
}

export function getPostLoginPath(profile: AppProfile) {
  return profile.must_reset_password ? "/change-password" : getRoleHome(profile.role);
}

export async function requireAuthenticatedProfile() {
  const { user, profile } = await getAuthContext();

  if (!user) {
    redirect("/login");
  }

  if (!profile || !profile.is_active) {
    redirect("/login?error=profile_missing");
  }

  return profile;
}

export async function requireAdminProfile() {
  const profile = await requireAuthenticatedProfile();

  if (profile.must_reset_password) {
    redirect("/change-password");
  }

  if (profile.role !== "admin") {
    redirect(getRoleHome("expert"));
  }

  return profile;
}

export async function requireExpertProfile() {
  const profile = await requireAuthenticatedProfile();

  if (profile.must_reset_password) {
    redirect("/change-password");
  }

  if (profile.role !== "expert") {
    redirect(getRoleHome("admin"));
  }

  return profile;
}

export async function redirectAuthenticatedUserFromPublicRoute() {
  const { user, profile } = await getAuthContext();

  if (!user || !profile || !profile.is_active) {
    return;
  }

  redirect(getPostLoginPath(profile));
}
