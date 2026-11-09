import type { Pet } from "@workspace/api-client-react";

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
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

export type CartLine = {
  key: string;
  menuItemId: string;
  quantity: number;
  milk: "whole" | "oat" | "almond" | "none";
  temperature: "hot" | "iced";
};

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

let audioCtx: AudioContext | null = null;
export function blip(freq = 660, dur = 0.08) {
  try {
    audioCtx = audioCtx ?? new AudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch {
    /* audio unavailable */
  }
}

export const STATUS_LINES: Record<string, string> = {
  accepted: "Ticket's on the rail!",
  preparing: "Paws on the portafilter...",
  ready: "Order up! Grab it at the counter.",
  collected: "Enjoy. Come back soon.",
  cancelled: "That one got cancelled. Sorry!",
};
