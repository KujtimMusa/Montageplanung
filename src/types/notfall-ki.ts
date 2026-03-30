/** Strukturierte KI-Antwort (Notfall-Agent, JSON) */
export type KiNotfallEmpfehlung = {
  einsatzId: string;
  name: string;
  employeeId: string;
  begruendung: string;
  einsatz: string;
};

export type NotfallAnalyse = {
  zusammenfassung: string;
  einsaetze: {
    id: string;
    projekt: string;
    datum: string;
    dringlichkeit: "hoch" | "normal";
    vorschlaege: {
      mitarbeiter_id: string;
      name: string;
      score: number;
      verfuegbar: boolean;
      konflikt: boolean;
      grund: string;
    }[];
  }[];
  warnungen: {
    typ: "personalengpass" | "konflikt" | "abwesenheit";
    text: string;
  }[];
  sofortmassnahme: string;
};

// Kompat-Alias: bestehender Name wird beibehalten, Typ-Inhalte folgen aber der neuen NotfallAnalyse.
export type KiNotfallAntwort = NotfallAnalyse;

export type KiErsatzKarte = {
  name: string;
  employeeId: string;
  grund: string;
  score: number;
};
