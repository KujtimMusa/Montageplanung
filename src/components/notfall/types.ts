import type { KiErsatzKarte } from "@/types/notfall-ki";
import type { ReactNode } from "react";

export type NotfallMitarbeiter = {
  id: string;
  name: string;
  department_id: string | null;
  qualifikationen: string[] | null;
  phone: string | null;
  whatsapp: string | null;
  abteilung: string | null;
  hatAbwesenheit?: boolean;
};

export type NotfallEinsatzZeile = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  project_id: string | null;
  project_title: string | null;
  projects: { title: string; farbe?: string | null } | null;
  teamName: string | null;
};

/** Kandidat für Auswahl-Card (KI + Pool) */
export type NotfallErsatzVorschlag = {
  id: string;
  name: string;
  kiGrund: string;
  score: number;
  quelle: "ki" | "pool";
};

export type NotfallSteuerungProps = {
  mitarbeiter: NotfallMitarbeiter[];
  ausfallId: string;
  setAusfallId: (id: string) => void;
  datum: string;
  setDatum: (d: string) => void;
  aktiverSchritt: number;
  setAktiverSchritt: (n: number) => void;
  betroffeneGeladen: boolean;
  kiLaed: boolean;
  onNotfallAnalysieren: () => void;
  einsätze: NotfallEinsatzZeile[];
  kandidatenProEinsatz: Record<string, { id: string; name: string }[]>;
  kiErsatz: Record<string, KiErsatzKarte>;
  manuellerErsatz: Record<string, string>;
  ersatzManuellSetzen: (einsatzId: string, employeeId: string | null) => void;
  onAlleErsatzBestaetigen: () => void;
  onResetNotfall: () => void;
  lädt: boolean;
  scannerElement?: ReactNode;
};
