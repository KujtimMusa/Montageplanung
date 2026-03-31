export type KiActionTyp =
  | "einsatz_erstellen"
  | "einsatz_loeschen"
  | "einsatz_verschieben"
  | "abwesenheit_bestaetigen"
  | "abwesenheit_ablehnen"
  | "mitarbeiter_zuweisen"
  | "projekt_status_setzen";

export interface KiAction {
  typ: KiActionTyp;
  label: string;
  payload: Record<string, unknown>;
  risiko: "niedrig" | "mittel" | "hoch";
}

export interface KiStrukturierteAntwort {
  zusammenfassung: string;
  details: string;
  aktionen: KiAction[];
  dringlichkeit: "info" | "warnung" | "kritisch";
}

export interface KiStrukturierteAgentAntwort {
  titel: string;
  zusammenfassung: string;
  abschnitte: Array<{
    ueberschrift: string;
    inhalt: string;
    typ: "info" | "warnung" | "erfolg" | "kritisch";
  }>;
  aktionen: KiAction[];
}
