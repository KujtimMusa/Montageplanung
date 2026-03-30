import type { NotfallAnalyse } from "@/types/notfall-ki";

function istAnalyseObjekt(x: unknown): x is NotfallAnalyse {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  return (
    typeof obj.zusammenfassung === "string" &&
    Array.isArray(obj.einsaetze) &&
    Array.isArray(obj.warnungen) &&
    typeof obj.sofortmassnahme === "string"
  );
}

function parseVersuch(text: string): NotfallAnalyse | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (istAnalyseObjekt(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function extrahiereJsonObjekte(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && start !== -1) {
        out.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return out;
}

export function parseKiAntwort(rawText: string): NotfallAnalyse {
  let cleaned = rawText.replace(/^\uFEFF/, "");

  // Schritt 1: ```json ... ``` und ``` ... ``` entfernen
  cleaned = cleaned
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .replace(/^data:\s*/gim, "")
    .trim();

  // 1) Direkter Parse
  const direkt = parseVersuch(cleaned);
  if (direkt) return direkt;

  // 2) Ersten { bis letzten } extrahieren
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const block = cleaned.substring(start, end + 1);
    const parsedBlock = parseVersuch(block);
    if (parsedBlock) return parsedBlock;
  }

  // 3) Alle balancierten JSON-Objekte testen
  const kandidaten = extrahiereJsonObjekte(cleaned);
  for (const kandidat of kandidaten) {
    const parsed = parseVersuch(kandidat);
    if (parsed) return parsed;
  }

  // 4) Leichte Bereinigung (Trailing Commas) und letzter Versuch
  const relaxed = cleaned.replace(/,\s*([}\]])/g, "$1");
  const parsedRelaxed = parseVersuch(relaxed);
  if (parsedRelaxed) return parsedRelaxed;

  console.error("[parseKiAntwort] JSON.parse fehlgeschlagen.");
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
