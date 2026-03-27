import { istKritischUi } from "@/lib/utils/priority";
import type { EinsatzEvent } from "@/types/planung";

export type SyncfusionEvent = {
  Id: string;
  /** Such-/Tooltip-Text: „Projekt · Rolle“ */
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  ProjectId: string;
  TeamId: string | null;
  TeamFarbe: string;
  Prioritaet: string;
  ZeitLabel: string;
  /** Projektname – Hauptzeile in der Karte */
  ProjektTitel: string;
  /** „Team“ oder „Partner“ (Badge) */
  RolleTag: "Team" | "Partner";
  /** Anzeigename Team oder Dienstleister */
  RolleName: string;
  OrtLabel: string;
  HatKonflikt: boolean;
  Kritisch: boolean;
  IsBlock: boolean;
  OriginalZuweisung: EinsatzEvent;
};

export function transformiereEinsatz(
  z: EinsatzEvent,
  hatKonflikt: boolean,
  teamFarbe: string
): SyncfusionEvent {
  const datumStr = z.date;
  const startStr = z.start_time?.slice(0, 5) ?? "07:00";
  const endStr = z.end_time?.slice(0, 5) ?? "16:00";
  const start = new Date(`${datumStr}T${startStr}:00`);
  const end = new Date(`${datumStr}T${endStr}:00`);

  const dlName = z.dienstleister?.company_name?.trim();
  const teamName = z.teams?.name?.trim();
  const istDienstleister = Boolean(z.dienstleister_id || dlName);
  const rolleTag: "Team" | "Partner" = istDienstleister ? "Partner" : "Team";
  const rolleName = istDienstleister
    ? (dlName || "Dienstleister")
    : (teamName || "Team");
  const projektTitel =
    z.projects?.title?.trim() ||
    z.project_title?.trim() ||
    "";
  const subject = projektTitel
    ? `${projektTitel} · ${rolleName}`
    : rolleName;

  return {
    Id: z.id,
    Subject: subject,
    StartTime: start,
    EndTime: end,
    ProjectId: z.project_id ?? "",
    TeamId: z.team_id ?? null,
    TeamFarbe: teamFarbe,
    Prioritaet: z.prioritaet ?? "normal",
    ZeitLabel: `${startStr} – ${endStr}`,
    ProjektTitel: projektTitel,
    RolleTag: rolleTag,
    RolleName: rolleName,
    OrtLabel: (z.ortLabel ?? "").trim(),
    HatKonflikt: hatKonflikt,
    Kritisch: istKritischUi(z.prioritaet, z.projects?.priority),
    IsBlock: false,
    OriginalZuweisung: z,
  };
}

export function transformiereZurueck(ev: SyncfusionEvent): {
  date: string;
  start_time: string;
  end_time: string;
  project_id: string;
} {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = ev.StartTime;
  const e = ev.EndTime;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    start_time: `${pad(d.getHours())}:${pad(d.getMinutes())}:00`,
    end_time: `${pad(e.getHours())}:${pad(e.getMinutes())}:00`,
    project_id: ev.ProjectId,
  };
}
