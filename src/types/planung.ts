/** Zentrale Typen für Planungskalender & Einsatz-Sheet */

export type EinsatzPrioritaetUi = "niedrig" | "mittel" | "hoch" | "kritisch";

export type EinsatzTeamMitglied = {
  id: string;
  name: string;
};

export type EinsatzEvent = {
  id: string;
  employee_id: string | null;
  project_id: string | null;
  project_title: string | null;
  team_id: string | null;
  dienstleister_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  prioritaet: string | null;
  /** Berechnet für Kalenderkarte & Tooltip */
  ortLabel: string | null;
  /** Abwesenheit im Team (Kalender) */
  hatKonflikt?: boolean;
  projects: {
    title: string;
    priority?: string | null;
    notes?: string | null;
    /** Hex, optional — Kalender-Pill */
    farbe?: string | null;
    /** Optional: Baustelle */
    adresse?: string | null;
    status?: string | null;
    customers?: {
      address?: string | null;
      city?: string | null;
      company_name?: string | null;
    } | null;
  } | null;
  teams: {
    id?: string;
    name: string;
    farbe?: string | null;
    mitglieder?: EinsatzTeamMitglied[];
  } | null;
  dienstleister: { company_name: string } | null;
};

export type TeamRessource = {
  id: string;
  name: string;
  farbe: string;
};

export type UngeplantesProjekt = {
  id: string;
  title: string;
  status: string;
  priority: string;
  customerLabel: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
};

export type TeamOption = {
  id: string;
  name: string;
  farbe: string;
  abteilung?: string | null;
};

export type ProjektOption = {
  id: string;
  title: string;
  status: string;
  priority: string;
  customerLabel: string;
  /** Projektfarbe (Hex) aus der Datenbank */
  farbe?: string | null;
};

export type BearbeitenZuweisung = {
  id: string;
  employee_id: string | null;
  project_id: string | null;
  team_id: string | null;
  dienstleister_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  prioritaet: string | null;
  /** Weitere IDs am selben Tag, selbes Projekt (zusammengefasste Kachel) */
  gruppe_weitere_assignment_ids?: string[];
  /** Alle Team-IDs der Gruppe (Mehrfachauswahl im Formular) */
  gruppe_team_ids?: string[];
  /** Alle Partner-IDs der Gruppe */
  gruppe_dienstleister_ids?: string[];
};

export type DienstleisterOption = {
  id: string;
  firma: string;
};

export type AbwesenheitRow = {
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  type: string;
};
