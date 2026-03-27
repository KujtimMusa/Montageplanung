import type { KiNotfallAntwort } from "@/types/notfall-ki";

/**
 * Parst die KI-Rohausgabe (evtl. Markdown-Codefence) zu strukturiertem JSON.
 */
export function parseKiAntwortRoh(raw: string): KiNotfallAntwort {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence?.[1]) t = fence[1].trim();

  try {
    const o = JSON.parse(t) as Partial<KiNotfallAntwort>;
    return {
      zusammenfassung:
        typeof o.zusammenfassung === "string"
          ? o.zusammenfassung
          : "Keine Zusammenfassung.",
      empfehlungen: Array.isArray(o.empfehlungen)
        ? o.empfehlungen.map((e) => ({
            einsatzId: String(e?.einsatzId ?? ""),
            name: String(e?.name ?? ""),
            employeeId: String(e?.employeeId ?? ""),
            begruendung: String(e?.begruendung ?? ""),
            einsatz: String(e?.einsatz ?? ""),
          }))
        : [],
      risiken: Array.isArray(o.risiken)
        ? o.risiken.map((r) => String(r))
        : [],
      kommunikation:
        typeof o.kommunikation === "string" ? o.kommunikation : "",
    };
  } catch {
    return {
      zusammenfassung: raw.trim() || "(Keine KI-Antwort)",
      empfehlungen: [],
      risiken: [],
      kommunikation: "",
    };
  }
}
