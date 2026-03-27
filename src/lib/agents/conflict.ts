import { rufeGeminiFlashAuf } from "@/lib/agents/gemini";

/**
 * Konflikt-Wächter — KI-Ebene (Phase 7), ergänzt Datenbank-Prüfung aus Phase 2.
 */
export async function konfliktAgentAufrufen(
  systemPrompt: string,
  nutzerPrompt: string
): Promise<string> {
  return rufeGeminiFlashAuf(systemPrompt, nutzerPrompt);
}
