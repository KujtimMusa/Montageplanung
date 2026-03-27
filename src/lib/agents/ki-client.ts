import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

/**
 * Zentrale Gemini-Anbindung (Vercel AI SDK).
 * GEMINI_MODEL optional; Standard gemini-2.5-flash.
 */
export function istKiKonfiguriert(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";

const google = createGoogleGenerativeAI({ apiKey });

export const kiModell = google(
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"
);

export { streamText, generateText };
