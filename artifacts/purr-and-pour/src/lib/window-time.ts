export type WindowPhase = "dawn" | "day" | "dusk" | "night";

/** Decorative local-clock phases, not location-based sunrise/sunset predictions. */
export function getWindowPhase(date: Date): WindowPhase {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

/** An optional HH:MM scenery override; never changes the supplied clock. */
export function getWindowPreviewDate(now: Date, value: string | null): Date {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return now;
  const [hour, minute] = value.split(":").map(Number);
  const preview = new Date(now);
  preview.setHours(hour, minute, 0, 0);
  return preview;
}
