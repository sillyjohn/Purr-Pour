export type MenuCategory = "coffee" | "tea" | "treats";
export type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  priceCents: number;
  available: boolean;
  badge?: string;
};
export type Pet = { id: string; name: string; species: string };
export type SpriteKind = "ginger" | "tuxedo" | "corgi";

export const asset = (path: string) => `/__mockup/images/welcome-wall${path}`;
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function spriteKind(pet: Pick<Pet, "id" | "name" | "species">): SpriteKind {
  if (pet.id === "miso") return "ginger";
  if (pet.id === "mochi") return "tuxedo";
  if (pet.id === "biscuit") return "corgi";
  const value = `${pet.id} ${pet.name} ${pet.species}`.toLowerCase();
  if (value.includes("corgi") || value.includes("dog")) return "corgi";
  if (value.includes("tux") || value.includes("sleep")) return "tuxedo";
  return "ginger";
}
