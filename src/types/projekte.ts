export type ProjektStatus =
  | "neu"
  | "geplant"
  | "aktiv"
  | "pausiert"
  | "abgeschlossen";

export type ProjektPrioritaet = "niedrig" | "normal" | "hoch" | "kritisch";

export const PROJEKT_STATUS: {
  value: ProjektStatus;
  label: string;
  farbe: string;
}[] = [
  { value: "neu", label: "Neu", farbe: "bg-zinc-500/20 text-zinc-400" },
  { value: "geplant", label: "Geplant", farbe: "bg-blue-500/20 text-blue-400" },
  { value: "aktiv", label: "Aktiv", farbe: "bg-emerald-500/20 text-emerald-400" },
  {
    value: "pausiert",
    label: "Pausiert",
    farbe: "bg-yellow-500/20 text-yellow-400",
  },
  {
    value: "abgeschlossen",
    label: "Abgeschlossen",
    farbe: "bg-zinc-600/20 text-zinc-500",
  },
];

export const PROJEKT_PRIORITAET: {
  value: ProjektPrioritaet;
  label: string;
  farbe: string;
  dot: string;
}[] = [
  { value: "niedrig", label: "Niedrig", farbe: "bg-zinc-500/20 text-zinc-400", dot: "#71717a" },
  { value: "normal", label: "Normal", farbe: "bg-blue-500/20 text-blue-400", dot: "#3b82f6" },
  { value: "hoch", label: "Hoch", farbe: "bg-orange-500/20 text-orange-400", dot: "#f97316" },
  { value: "kritisch", label: "Kritisch", farbe: "bg-red-500/20 text-red-400", dot: "#ef4444" },
];

export function normalisiereStatus(raw: string): ProjektStatus {
  const v = raw as ProjektStatus;
  return PROJEKT_STATUS.some((s) => s.value === v) ? v : "neu";
}

export function normalisierePrioritaet(raw: string): ProjektPrioritaet {
  const v = raw as ProjektPrioritaet;
  return PROJEKT_PRIORITAET.some((p) => p.value === v) ? v : "normal";
}
