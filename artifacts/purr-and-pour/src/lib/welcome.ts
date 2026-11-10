export const BARISTA_GREETING = "What can meow do for you today?";

type WelcomeProfile = {
  username?: string | null;
  firstName?: string | null;
  fullName?: string | null;
};

export function resolveWelcomeName(profile?: WelcomeProfile | null): string {
  return profile?.username?.trim()
    || profile?.firstName?.trim()
    || profile?.fullName?.trim()
    || "hairy stranger";
}
