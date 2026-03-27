import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini Flash — zentrale KI-Hilfsfunktion (ersetzt Claude im Bauplan).
 * Modell-ID bei Bedarf anpassen (z. B. gemini-1.5-flash).
 */
export async function rufeGeminiFlashAuf(
  systemPrompt: string,
  nutzerPrompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ist nicht gesetzt.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modell = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const antwort = await modell.generateContent(nutzerPrompt);
  const text = antwort.response.text();
  return text;
}
