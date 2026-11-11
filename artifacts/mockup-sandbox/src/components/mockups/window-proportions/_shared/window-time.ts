export type WindowPhase = "dawn" | "day" | "dusk" | "night";

/** Decorative local-clock phases, not location-based sunrise/sunset predictions. */
export function getWindowPhase(date: Date): WindowPhase {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}
