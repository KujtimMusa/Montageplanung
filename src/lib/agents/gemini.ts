import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELL_ID = "gemini-2.0-flash";

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
    model: MODELL_ID,
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
  } catch {
    return null;
  }
}
