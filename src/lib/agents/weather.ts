import { rufeGeminiFlashAuf } from "@/lib/agents/gemini";

/**
 * Wetter-KI (Phase 7) — interpretiert Open-Meteo-Daten.
 */
export async function wetterAgentAufrufen(
  systemPrompt: string,
  nutzerPrompt: string
): Promise<string> {
  return rufeGeminiFlashAuf(systemPrompt, nutzerPrompt);
}
