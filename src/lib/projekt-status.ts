import { normalisiereStatus, type ProjektStatus } from "@/types/projekte";

/** Farben für Status-Punkte (Dropdown / Legende) */
export const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; farbe?: string }
> = {
  neu: { label: "Neu", dot: "#71717a", farbe: "bg-zinc-500/20 text-zinc-400" },
  geplant: { label: "Geplant", dot: "#3b82f6", farbe: "bg-blue-500/20 text-blue-400" },
  aktiv: { label: "Aktiv", dot: "#10b981", farbe: "bg-emerald-500/20 text-emerald-400" },
  pausiert: {
    label: "Pausiert",
    dot: "#eab308",
    farbe: "bg-yellow-500/20 text-yellow-400",
  },
  abgeschlossen: {
    label: "Abgeschlossen",
    dot: "#22c55e",
    farbe: "bg-zinc-600/20 text-zinc-500",
  },
  kritisch: {
    label: "Kritisch",
    dot: "#ef4444",
    farbe: "bg-red-500/20 text-red-400",
  },
};

/** Reihenfolge im Projekt-Dialog */
export const STATUS_DIALOG_REIHENFOLGE: ProjektStatus[] = [
  "neu",
  "geplant",
  "aktiv",
  "pausiert",
  "abgeschlossen",
  "kritisch",
];

/**
 * Automatische Status-Anzeige, wenn der gespeicherte Status nicht „manuell fix“ ist.
 * Manuell: abgeschlossen, kritisch, pausiert.
 */
export function autoStatus(p: {
  status: string;
  planned_start: string | null;
  assignments_count: number;
}): ProjektStatus {
  const s = normalisiereStatus(p.status);
  if (["abgeschlossen", "kritisch", "pausiert"].includes(s)) return s;
  const heute = new Date().toISOString().split("T")[0];
  if (p.assignments_count > 0 && p.planned_start && p.planned_start <= heute) {
    return "aktiv";
  }
  if (p.assignments_count > 0) return "geplant";
  return "neu";
}
