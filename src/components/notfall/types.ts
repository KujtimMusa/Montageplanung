import type { KiErsatzKarte } from "@/types/notfall-ki";

export type NotfallMitarbeiter = {
  id: string;
  name: string;
  department_id: string | null;
  qualifikationen: string[] | null;
  phone: string | null;
  whatsapp: string | null;
  abteilung: string | null;
};

export type NotfallEinsatzZeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  project_id: string | null;
  project_title: string | null;
  projects: { title: string } | null;
  teamName: string | null;
};

export type NotfallSteuerungProps = {
  mitarbeiter: NotfallMitarbeiter[];
  ausfallId: string;
  setAusfallId: (id: string) => void;
  datum: string;
  setDatum: (d: string) => void;
  schritt: number;
  kiLaed: boolean;
  onNotfallAnalysieren: () => void;
  einsätze: NotfallEinsatzZeile[];
  kandidatenProEinsatz: Record<string, { id: string; name: string }[]>;
  kiErsatz: Record<string, KiErsatzKarte>;
  manuellerErsatz: Record<string, string>;
  ersatzManuellSetzen: (einsatzId: string, employeeId: string | null) => void;
  ersatzBestaetigen: (einsatzId: string) => void;
  alleKiErsatzBestaetigen: () => void;
  lädt: boolean;
};
