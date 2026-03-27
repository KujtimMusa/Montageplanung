/** Zentrale Typen für Planungskalender & Einsatz-Sheet */

export type EinsatzPrioritaetUi = "niedrig" | "mittel" | "hoch" | "kritisch";

export type EinsatzEvent = {
  id: string;
  employee_id: string;
  project_id: string | null;
  project_title: string | null;
  team_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  prioritaet: string | null;
  projects: { title: string; priority?: string | null } | null;
  teams: { name: string; farbe?: string | null } | null;
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

export type TeamOption = { id: string; name: string; farbe: string };

export type ProjektOption = {
  id: string;
  title: string;
  status: string;
  priority: string;
  customerLabel: string;
};

export type BearbeitenZuweisung = {
  id: string;
  employee_id: string;
  project_id: string | null;
  team_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  prioritaet: string | null;
};

export type AbwesenheitRow = {
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  type: string;
};
