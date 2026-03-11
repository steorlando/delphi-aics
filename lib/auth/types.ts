export type AppRole = "admin" | "expert";

export type AppProfile = {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  institution_name: string | null;
  role: AppRole;
  must_reset_password: boolean;
  is_active: boolean;
};
