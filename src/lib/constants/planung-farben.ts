export const PRIORITAET_FARBEN: Record<string, string> = {
  niedrig: "#71717a",
  normal: "#3b82f6",
  mittel: "#3b82f6",
  hoch: "#f97316",
  kritisch: "#ef4444",
};

export const STATUS_FARBEN: Record<string, string> = {
  neu: "bg-zinc-500/20 text-zinc-400",
  geplant: "bg-blue-500/20 text-blue-400",
  aktiv: "bg-emerald-500/20 text-emerald-400",
  pausiert: "bg-yellow-500/20 text-yellow-400",
  abgeschlossen: "bg-zinc-700/20 text-zinc-500",
};

export function planungStatusLabel(s: string): string {
  const m: Record<string, string> = {
    neu: "Neu",
    geplant: "Geplant",
    aktiv: "Aktiv",
    pausiert: "Pausiert",
    abgeschlossen: "Abgeschlossen",
  };
  return m[s] ?? s;
}

export function planungPrioritaetLabel(p: string): string {
  const m: Record<string, string> = {
    niedrig: "Niedrig",
    normal: "Normal",
    mittel: "Mittel",
    hoch: "Hoch",
    kritisch: "Kritisch",
  };
  return m[p] ?? p;
}
