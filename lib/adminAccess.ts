// Central definition of the admin-tier roles and what each one can see/do.
// Keep this in sync with app/admin/AdminSidebar.tsx (tab list) and
// middleware.ts (route-level gating). Every admin-data API route should
// import from here instead of hand-rolling its own role checks so the
// four sub-admin roles stay consistent across the whole app.

export type AdminScope = "orders" | "users" | "finance" | "support";

export const SUB_ADMIN_ROLES = [
  "sub_admin_orders",
  "sub_admin_users",
  "sub_admin_finance",
  "sub_admin_support",
] as const;

export type SubAdminRole = (typeof SUB_ADMIN_ROLES)[number];
export type AdminTierRole = "admin" | SubAdminRole;

const SCOPE_BY_ROLE: Record<SubAdminRole, AdminScope> = {
  sub_admin_orders: "orders",
  sub_admin_users: "users",
  sub_admin_finance: "finance",
  sub_admin_support: "support",
};

/** True for the full-access top-level admin only. */
export function isFullAdmin(role?: string | null): boolean {
  return role === "admin";
}

/** True for the top admin OR any of the four sub-admin roles. */
export function isAdminTier(role?: string | null): boolean {
  return role === "admin" || SUB_ADMIN_ROLES.includes(role as SubAdminRole);
}

/**
 * True if this role is allowed to read/act within a given scope.
 * The full admin can access every scope; a sub-admin only their own.
 */
export function canAccessScope(role: string | undefined | null, scope: AdminScope): boolean {
  if (role === "admin") return true;
  return SCOPE_BY_ROLE[role as SubAdminRole] === scope;
}

/** Convenience: build the `role !== admin && role !== scoped` 403 check. */
export function scopeDenied(role: string | undefined | null, scope: AdminScope): boolean {
  return !canAccessScope(role, scope);
}

/** Which scopes (if any) this admin-tier role can see — used by the UI. */
export function scopesForRole(role?: string | null): AdminScope[] {
  if (role === "admin") return ["orders", "users", "finance", "support"];
  const scope = SCOPE_BY_ROLE[role as SubAdminRole];
  return scope ? [scope] : [];
}
