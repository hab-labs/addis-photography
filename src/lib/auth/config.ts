import type { UserRole } from "@/types";

export const AUTH_COOKIE_NAME = "addis_auth_role";

export const DEMO_PASSWORDS: Record<string, string> = {
  yonas: "yonas123",
  selam: "selam123",
  dawit: "dawit123",
};

export function isUserRole(value: string | undefined): value is UserRole {
  return value === "admin" || value === "staff";
}
