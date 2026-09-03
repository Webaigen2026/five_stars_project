import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "./auth";

export const STAFF_ROLES = ["STAFF", "ADMIN"] as const;
export const ADMIN_ROLE = "ADMIN";

export function isStaffOrAdmin(role: string) {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isAdmin(role: string) {
  return role === ADMIN_ROLE;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireStaffOrAdmin(): Promise<CurrentUser> {
  const user = await requireUser();

  if (!isStaffOrAdmin(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();

  if (!isAdmin(user.role)) {
    redirect(isStaffOrAdmin(user.role) ? "/admin" : "/dashboard");
  }

  return user;
}
