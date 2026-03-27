/** Strukturierte KI-Antwort (Notfall-Agent, JSON) */
export type KiNotfallEmpfehlung = {
  einsatzId: string;
  name: string;
  employeeId: string;
  begruendung: string;
  einsatz: string;
};

export type KiNotfallAntwort = {
  zusammenfassung: string;
  empfehlungen: KiNotfallEmpfehlung[];
  risiken: string[];
  kommunikation: string;
};

export type KiErsatzKarte = {
  name: string;
  employeeId: string;
  grund: string;
};
