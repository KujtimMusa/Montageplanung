import { rufeGeminiFlashAuf } from "@/lib/agents/gemini";

/**
 * Planungsassistent (Phase 7) — JSON-Struktur aus dem Bauplan.
 */
export async function planungsassistentAufrufen(
  systemPrompt: string,
  nutzerPrompt: string
): Promise<string> {
  return rufeGeminiFlashAuf(systemPrompt, nutzerPrompt);
}
