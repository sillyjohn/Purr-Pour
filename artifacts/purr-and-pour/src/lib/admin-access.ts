export const ADMIN_SECTIONS = ["orders", "queue", "menu", "analytics", "customer", "structure"] as const;
export type AdminSection = typeof ADMIN_SECTIONS[number];

// Trust only the identity returned by the server, never URL flags or user-editable metadata.
export function isAdminIdentity(identity: unknown): boolean {
  if (!identity || typeof identity !== "object") return false;
  const value = identity as {signedIn?: unknown; role?: unknown};
  return value.signedIn === true && value.role === "admin";
}

export function adminSection(path: string): AdminSection | null {
  if (!path.startsWith("/admin/")) return null;
  const section = path.replace(/\/$/, "").slice("/admin/".length);
  return (ADMIN_SECTIONS as readonly string[]).includes(section) ? section as AdminSection : null;
}

export function afterSignInPath(identity: unknown): string {
  return isAdminIdentity(identity) ? "/admin/orders" : "/";
}
