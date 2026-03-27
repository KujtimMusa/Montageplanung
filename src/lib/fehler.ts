/** Postgrest/Supabase-Fehler sind oft kein `Error`-Objekt — trotzdem `.message` setzen. */
export function nachrichtAusUnbekannt(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    const m = (e as { message: string }).message;
    if (m) return m;
  }
  return fallback;
}
