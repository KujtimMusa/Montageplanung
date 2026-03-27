/**
 * Konfliktprüfung vor Speichern — Implementierung in Phase 2 (Supabase).
 */
export type KonfliktErgebnis = {
  hatKonflikt: boolean;
  nachricht: string;
};

export async function pruefeKonflikte(): Promise<KonfliktErgebnis> {
  return {
    hatKonflikt: false,
    nachricht: "Noch nicht implementiert (Phase 2).",
  };
}
