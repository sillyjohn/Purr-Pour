import type { Pet } from "./fixtures";

export const basePath = "/__mockup/images/window-proportions";
export const asset = (p: string) => `${basePath}${p}`;

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function apiError(err: unknown): string {
  const e = err as { data?: { error?: string }; message?: string; status?: number } | null;
  return e?.data?.error || e?.message || "Something spilled. Try again.";
}

export type SpriteKind = "ginger" | "tuxedo" | "corgi";

export function spriteKind(pet: Pick<Pet, "id" | "name" | "species">): SpriteKind {
  if (pet.id === "miso") return "ginger";
  if (pet.id === "mochi") return "tuxedo";
  if (pet.id === "biscuit") return "corgi";
  const s = `${pet.id} ${pet.name} ${pet.species}`.toLowerCase();
  if (s.includes("corgi") || s.includes("dog")) return "corgi";
  if (s.includes("tux") || s.includes("sleep")) return "tuxedo";
  return "ginger";
}

