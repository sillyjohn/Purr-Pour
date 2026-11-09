/**
 * Explicit owner-operated development role grant.
 * Usage: pnpm --filter @workspace/scripts exec tsx src/grant-role.ts verified-email@example.com admin
 * Never run automatically at startup or use a hardcoded account identifier.
 */
export {};
const [email, role] = process.argv.slice(2);
if (!email || !["customer", "staff", "admin"].includes(role || "")) {
  throw new Error("Usage: grant-role.ts <verified account email> <customer|staff|admin>");
}
const secret = process.env.CLERK_SECRET_KEY;
if (!secret) throw new Error("Clerk is not configured in this environment");
if (!secret.startsWith("sk_test_")) throw new Error("This command is restricted to the development Clerk instance");
const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const query = new URLSearchParams({ email_address: email, limit: "10" });
const lookup = await fetch(`https://api.clerk.com/v1/users?${query}`, { headers });
if (!lookup.ok) throw new Error(`Clerk user lookup failed (${lookup.status})`);
type ClerkUser = {
  id: string;
  public_metadata: Record<string, unknown>;
  email_addresses: { email_address: string; verification: { status: string } | null }[];
};
const users = await lookup.json() as ClerkUser[];
const user = users.find((u) => u.email_addresses.some((e) =>
  e.email_address.toLowerCase() === email.toLowerCase() && e.verification?.status === "verified"));
if (!user) throw new Error("Create and verify the account first. No role was changed.");
if (user.public_metadata.role === role) {
  process.stdout.write("The account already has that role. No changes made.\n");
} else {
  const result = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(user.id)}/metadata`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ public_metadata: { role } }),
  });
  if (!result.ok) throw new Error(`Role update failed (${result.status})`);
  process.stdout.write("Development role updated. Allow up to 30 seconds for the authorization cache to refresh.\n");
}
