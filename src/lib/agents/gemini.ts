import { GoogleGenerativeAI } from "@google/generative-ai";

/** Standard: 1.5 Flash ist stabil; per GEMINI_MODEL überschreibbar (z. B. gemini-2.0-flash). */
function modellId(): string {
  return (
    process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash"
  );
}

/**
 * Prüft, ob die Gemini-API konfiguriert ist.
 */
export function istGeminiKonfiguriert(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Gemini Flash — zentrale KI-Hilfsfunktion.
 * @throws nur bei gesetztem API-Key und API-Fehler
 */
export async function rufeGeminiFlashAuf(
  systemPrompt: string,
  nutzerPrompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY ist nicht gesetzt — bitte in den Umgebungsvariablen hinterlegen."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modell = genAI.getGenerativeModel({
    model: modellId(),
    systemInstruction: systemPrompt,
  });

  const antwort = await modell.generateContent(nutzerPrompt);
  const text = antwort.response.text();
  return text;
}

/**
 * Wie {@link rufeGeminiFlashAuf}, gibt bei fehlendem Key `null` statt Exception.
 */
export async function rufeGeminiOptional(
  systemPrompt: string,
  nutzerPrompt: string
): Promise<string | null> {
  if (!istGeminiKonfiguriert()) return null;
  try {
    return await rufeGeminiFlashAuf(systemPrompt, nutzerPrompt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Gemini]", msg);
    return null;
  }
}
