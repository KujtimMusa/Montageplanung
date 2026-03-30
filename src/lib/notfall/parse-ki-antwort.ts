import type { NotfallAnalyse } from "@/types/notfall-ki";

export function parseKiAntwort(rawText: string): NotfallAnalyse {
  let cleaned = rawText;

  // Schritt 1: ```json ... ``` und ``` ... ``` entfernen
  cleaned = cleaned
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  // Schritt 2: Ersten { bis letzten } extrahieren
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Schritt 3: Parse mit Fallback
  try {
    return JSON.parse(cleaned) as NotfallAnalyse;
  } catch (e) {
    console.error("[parseKiAntwort] JSON.parse fehlgeschlagen:", e);
    console.error("[parseKiAntwort] Raw:", rawText);
    return {
      zusammenfassung:
        "KI-Antwort konnte nicht verarbeitet werden. Bitte erneut analysieren.",
      einsaetze: [],
      warnungen: [
        {
          typ: "personalengpass",
          text: "Parse-Fehler – Gemini hat kein valides JSON geliefert.",
        },
      ],
      sofortmassnahme: "Analyse neu starten.",
    };
  }
}
