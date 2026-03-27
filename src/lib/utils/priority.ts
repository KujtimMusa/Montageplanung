import type { EinsatzPrioritaetUi } from "@/types/planung";

/** DB projects.priority (englisch/kurz) → UI */
export function dbPrioritaetZuUi(
  p: string | null | undefined
): EinsatzPrioritaetUi {
  const x = (p ?? "normal").toLowerCase();
  if (x === "low" || x === "niedrig") return "niedrig";
  if (x === "high" || x === "hoch") return "hoch";
  if (x === "urgent" || x === "kritisch") return "kritisch";
  return "mittel";
}

export function uiPrioritaetZuDb(p: EinsatzPrioritaetUi): string {
  const m: Record<EinsatzPrioritaetUi, string> = {
    niedrig: "low",
    mittel: "normal",
    hoch: "high",
    kritisch: "urgent",
  };
  return m[p];
}

export function istKritischUi(
  prioritaet: string | null | undefined,
  projektPriority: string | null | undefined
): boolean {
  const u = dbPrioritaetZuUi(prioritaet ?? projektPriority);
  return u === "kritisch";
}
