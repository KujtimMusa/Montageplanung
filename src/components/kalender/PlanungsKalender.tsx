"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, {
  type DateClickArg,
  type EventReceiveArg,
  type EventResizeDoneArg,
} from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import deLocale from "@fullcalendar/core/locales/de";
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import { Clock, MapPin, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ortLabelFromProjektJoin } from "@/lib/planung/ort-label";
import { PRIORITAET_FARBEN } from "@/lib/constants/planung-farben";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { istKritischUi } from "@/lib/utils/priority";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { toast } from "sonner";
import {
  EinsatzNeuDialog,
  type BearbeitenZuweisung,
  type ProjektOption,
  type TeamOption,
} from "@/components/kalender/EinsatzNeuDialog";
import { PlanungsToolbar } from "@/components/kalender/PlanungsToolbar";
import { ProjekteSidebar } from "@/components/kalender/ProjekteSidebar";
import { TeamsSidebar } from "@/components/kalender/TeamsSidebar";
import { EinsatzEventDetailFloating } from "@/components/kalender/EinsatzEventDetail";
import type {
  AbwesenheitRow,
  EinsatzEvent,
  UngeplantesProjekt,
} from "@/types/planung";
import {
  subcontractorRowToDienstleister,
  type Dienstleister,
} from "@/types/dienstleister";
import { useDefaultLayout } from "react-resizable-panels";

function datumUndZeitZuIso(datum: string, zeit: string): string {
  const z = zeit.length === 5 ? `${zeit}:00` : zeit;
  return `${datum}T${z}`;
}

function teamHatKonflikt(
  teamId: string,
  datum: string,
  membersByTeam: Map<string, Set<string>>,
  abwesenheiten: AbwesenheitRow[]
): boolean {
  const members = membersByTeam.get(teamId);
  if (!members || members.size === 0) return false;
  for (const empId of Array.from(members)) {
    for (const a of abwesenheiten) {
      if (
        a.employee_id === empId &&
        datum >= a.start_date &&
        datum <= a.end_date
      ) {
        return true;
      }
    }
  }
  return false;
}

function mapProjektRow(p: Record<string, unknown>): ProjektOption {
  const cust = p.customers as
    | { company_name?: string | null }
    | { company_name?: string | null }[]
    | null;
  const c = Array.isArray(cust) ? cust[0] : cust;
  return {
    id: p.id as string,
    title: p.title as string,
    status: (p.status as string) ?? "neu",
    priority: (p.priority as string) ?? "normal",
    customerLabel: (c?.company_name as string) ?? "",
  };
}

function mapUngeplantRow(p: Record<string, unknown>): UngeplantesProjekt {
  const o = mapProjektRow(p);
  return {
    ...o,
    plannedStart: (p.planned_start as string | null) ?? null,
    plannedEnd: (p.planned_end as string | null) ?? null,
  };
}

function prioRangUngeplant(prio: string): number {
  switch (prio) {
    case "kritisch":
      return 1;
    case "hoch":
      return 2;
    case "normal":
    case "mittel":
      return 3;
    case "niedrig":
      return 4;
    default:
      return 5;
  }
}

export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const calendarRef = useRef<FullCalendar>(null);
  const [teamsListe, setTeamsListe] = useState<TeamOption[]>([]);
  const [zuweisungen, setZuweisungen] = useState<EinsatzEvent[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<AbwesenheitRow[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<Map<string, Set<string>>>(
    () => new Map()
  );
  const [projekteAktiv, setProjekteAktiv] = useState<ProjektOption[]>([]);
  const [ungeplanteProjekte, setUngeplanteProjekte] = useState<
    UngeplantesProjekt[]
  >([]);
  const [dienstleisterListe, setDienstleisterListe] = useState<Dienstleister[]>(
    []
  );
  const [eigeneMitarbeiterId, setEigeneMitarbeiterId] = useState<string | null>(
    null
  );
  const [kalenderBereit, setKalenderBereit] = useState(false);
  const [mitgliederByTeam, setMitgliederByTeam] = useState<
    Map<string, { id: string; name: string }[]>
  >(() => new Map());
  const [sichtbarerZeitraum, setSichtbarerZeitraum] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<BearbeitenZuweisung | null>(null);
  const [vorgaben, setVorgaben] = useState<{
    team_id?: string;
    date: string;
    start_time?: string;
    end_time?: string;
    projekt_id?: string;
    dienstleister_id?: string;
    dienstleister_name?: string;
  } | null>(null);
  const [formularSchluessel, setFormularSchluessel] = useState(0);

  const [kalenderAnsicht, setKalenderAnsicht] = useState<"week" | "month">(
    "week"
  );

  const [detailZuweisung, setDetailZuweisung] = useState<EinsatzEvent | null>(
    null
  );
  const [detailPosition, setDetailPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [detailOffen, setDetailOffen] = useState(false);
  const [loeschenDialogOffen, setLoeschenDialogOffen] = useState(false);

  const [zeitraumLabel, setZeitraumLabel] = useState("");

  /** v2: alte Keys wiesen minSize in px aus; Storage-Key bump leert fehlerhafte Layouts. */
  const { defaultLayout: planungLayout, onLayoutChanged: planungLayoutChanged } =
    useDefaultLayout({
      id: "planung-layout-v2",
      panelIds: ["projekte-sidebar", "kalender-mitte", "teams-sidebar"],
      storage:
        typeof window !== "undefined" ? window.localStorage : undefined,
    });

  const laden = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: ich } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (ich?.id) setEigeneMitarbeiterId(ich.id);

      const { data: teamRows, error: teamErr } = await supabase
        .from("teams")
        .select("id,name,farbe,departments(name)")
        .order("name");

      if (teamErr) {
        toast.error(`Teams konnten nicht geladen werden: ${teamErr.message}`);
        setTeamsListe([]);
      } else {
        setTeamsListe(
          (teamRows ?? []).map((t) => {
            const dep = t.departments as
              | { name?: string | null }
              | { name?: string | null }[]
              | null;
            const d = Array.isArray(dep) ? dep[0] : dep;
            return {
              id: t.id as string,
              name: t.name as string,
              farbe: (t.farbe as string) ?? "#3b82f6",
              abteilung: (d?.name as string | undefined) ?? null,
            };
          })
        );
      }

      const teamIds = (teamRows ?? []).map((t) => t.id as string);

      const { data: tmRows } =
        teamIds.length > 0
          ? await supabase
              .from("team_members")
              .select("team_id,employee_id,employees(id,name)")
              .in("team_id", teamIds)
          : {
              data: [] as {
                team_id: string;
                employee_id: string;
                employees: unknown;
              }[],
            };

      const map = new Map<string, Set<string>>();
      const mitgliederMap = new Map<string, { id: string; name: string }[]>();
      for (const row of tmRows ?? []) {
        const tid = row.team_id as string;
        const eid = row.employee_id as string;
        if (!map.has(tid)) map.set(tid, new Set());
        map.get(tid)!.add(eid);

        const e = row.employees as
          | { id?: string; name?: string }
          | { id?: string; name?: string }[]
          | null;
        const emp = Array.isArray(e) ? e[0] : e;
        if (emp?.id && emp?.name) {
          if (!mitgliederMap.has(tid)) mitgliederMap.set(tid, []);
          mitgliederMap.get(tid)!.push({ id: emp.id, name: emp.name });
        }
      }
      setMembersByTeam(map);
      setMitgliederByTeam(mitgliederMap);

      const memberIds = Array.from(
        new Set((tmRows ?? []).map((r) => r.employee_id as string))
      );

      const projektSelect =
        "id,title,status,priority,planned_start,planned_end,notes,customers(company_name,address,city)";

      const { data: pr, error: prErr } = await supabase
        .from("projects")
        .select(projektSelect)
        .neq("status", "abgeschlossen")
        .order("title");

      if (prErr) {
        toast.error(`Projekte konnten nicht geladen werden: ${prErr.message}`);
        setProjekteAktiv([]);
      } else {
        setProjekteAktiv(
          (pr ?? []).map((row) => mapProjektRow(row as Record<string, unknown>))
        );
      }

      const heute = format(new Date(), "yyyy-MM-dd");

      /** Projekte mit mindestens einem Einsatz ab heute gelten als „eingeplant“. */
      const { data: busyRows } = await supabase
        .from("assignments")
        .select("project_id")
        .not("project_id", "is", null)
        .gte("date", heute);

      const busyIds = new Set(
        (busyRows ?? [])
          .map((r) => r.project_id as string)
          .filter(Boolean)
      );

      const { data: offeneProjektRows, error: offenErr } = await supabase
        .from("projects")
        .select(projektSelect)
        .neq("status", "abgeschlossen");

      if (offenErr) {
        toast.error(
          `Offene Projekte konnten nicht geladen werden: ${offenErr.message}`
        );
        setUngeplanteProjekte([]);
      } else {
        const ohneArchiviert = (offeneProjektRows ?? []).filter(
          (p) => (p.status as string) !== "archiviert"
        ) as Record<string, unknown>[];

        const ungeplant = ohneArchiviert.filter(
          (p) => !busyIds.has(p.id as string)
        );

        ungeplant.sort((a, b) => {
          const pa = prioRangUngeplant((a.priority as string) ?? "normal");
          const pb = prioRangUngeplant((b.priority as string) ?? "normal");
          if (pa !== pb) return pa - pb;
          const as = (a.planned_start as string | null) ?? null;
          const bs = (b.planned_start as string | null) ?? null;
          if (as == null && bs == null) return 0;
          if (as == null) return 1;
          if (bs == null) return -1;
          return as.localeCompare(bs);
        });

        setUngeplanteProjekte(ungeplant.map(mapUngeplantRow));
      }

      const { data: subRows, error: subErr } = await supabase
        .from("subcontractors")
        .select(
          "id,company_name,contact_name,email,phone,whatsapp_number,specialization,lead_time_days,notes,created_at,website,address,status,active"
        )
        .order("company_name");
      if (subErr) {
        setDienstleisterListe([]);
      } else {
        setDienstleisterListe(
          (subRows ?? []).map((r) =>
            subcontractorRowToDienstleister(r as Record<string, unknown>)
          )
        );
      }

      const selectMitPrioritaet =
        "id,employee_id,project_id,project_title,team_id,dienstleister_id,date,start_time,end_time,notes,prioritaet, projects(title,priority,notes, customers(address,city,company_name)), teams(name,farbe), subcontractors(company_name)";
      const selectOhnePrioritaet =
        "id,employee_id,project_id,project_title,team_id,dienstleister_id,date,start_time,end_time,notes, projects(title,priority,notes, customers(address,city,company_name)), teams(name,farbe), subcontractors(company_name)";

      const zuQuery = await supabase
        .from("assignments")
        .select(selectMitPrioritaet)
        .or("team_id.not.is.null,dienstleister_id.not.is.null");
      let zu: Record<string, unknown>[] = (zuQuery.data ??
        []) as Record<string, unknown>[];
      let zuErr = zuQuery.error;

      if (zuErr?.message?.includes("prioritaet") || zuErr?.code === "42703") {
        const r2 = await supabase
          .from("assignments")
          .select(selectOhnePrioritaet)
          .or("team_id.not.is.null,dienstleister_id.not.is.null");
        zu = (r2.data ?? []) as Record<string, unknown>[];
        zuErr = r2.error;
      }

      if (zuErr) {
        toast.error(`Einsätze konnten nicht geladen werden: ${zuErr.message}`);
        setZuweisungen([]);
      } else {
        const normalisiert: EinsatzEvent[] = (zu ?? []).map((row) => {
          const p = row.projects as
            | {
                title?: string;
                priority?: string | null;
                notes?: string | null;
                customers?: unknown;
              }
            | {
                title?: string;
                priority?: string | null;
                notes?: string | null;
                customers?: unknown;
              }[]
            | null;
          const projekt = Array.isArray(p) ? p[0] : p;
          const custRaw = projekt?.customers as
            | { address?: string | null; city?: string | null; company_name?: string | null }
            | { address?: string | null; city?: string | null; company_name?: string | null }[]
            | null;
          const cust = Array.isArray(custRaw) ? custRaw[0] : custRaw;
          const t = row.teams as
            | { name?: string; farbe?: string }
            | { name?: string; farbe?: string }[]
            | null;
          const team = Array.isArray(t) ? t[0] : t;
          const subEmb = row.subcontractors as
            | { company_name?: string }
            | { company_name?: string }[]
            | null;
          const subcontractor = Array.isArray(subEmb) ? subEmb[0] : subEmb;
          const projectsNested = projekt?.title
            ? {
                title: projekt.title as string,
                priority: projekt.priority as string | undefined,
                notes: projekt.notes as string | null | undefined,
                customers: cust
                  ? {
                      address: cust.address,
                      city: cust.city,
                      company_name: cust.company_name,
                    }
                  : null,
              }
            : null;
          const ortLabel = ortLabelFromProjektJoin(
            projekt
              ? {
                  notes: projekt.notes ?? null,
                  customers: projekt.customers as never,
                }
              : null
          );
          return {
            id: row.id as string,
            employee_id: row.employee_id as string,
            project_id: (row.project_id as string | null) ?? null,
            project_title: (row.project_title as string | null) ?? null,
            team_id: (row.team_id as string | null) ?? null,
            dienstleister_id: (row.dienstleister_id as string | null) ?? null,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            notes: (row.notes as string | null) ?? null,
            prioritaet: (row as { prioritaet?: string | null }).prioritaet ?? null,
            ortLabel: ortLabel || null,
            projects: projectsNested,
            teams: team?.name
              ? { name: team.name as string, farbe: team.farbe as string | undefined }
              : null,
            dienstleister: subcontractor?.company_name
              ? { company_name: subcontractor.company_name as string }
              : null,
          };
        });
        setZuweisungen(normalisiert);
      }

      if (memberIds.length === 0) {
        setAbwesenheiten([]);
      } else {
        const { data: abw, error: abwErr } = await supabase
          .from("absences")
          .select("employee_id,start_date,end_date,type,employees(name)")
          .in("employee_id", memberIds);

        if (abwErr) {
          setAbwesenheiten([]);
        } else {
          const list: AbwesenheitRow[] = (abw ?? []).map((row) => {
            const e = row.employees as
              | { name?: string }
              | { name?: string }[]
              | null;
            const name = Array.isArray(e) ? e[0]?.name : e?.name;
            return {
              employee_id: row.employee_id as string,
              employee_name: (name as string) ?? "Mitarbeiter",
              start_date: row.start_date as string,
              end_date: row.end_date as string,
              type: (row.type as string) ?? "sonstiges",
            };
          });
          setAbwesenheiten(list);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Kalenderdaten konnten nicht geladen werden: ${msg}`);
    } finally {
      setKalenderBereit(true);
    }
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  useEffect(() => {
    const kanal = supabase
      .channel("kalender-realtime-p5")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        () => {
          void laden();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absences" },
        () => {
          void laden();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => {
          void laden();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        () => {
          void laden();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [supabase, laden]);

  const dlQuery = searchParams.get("dienstleister");
  useEffect(() => {
    if (!dlQuery || !kalenderBereit) return;
    router.replace("/planung", { scroll: false });
    setBearbeiten(null);
    setVorgaben({
      team_id: teamsListe[0]?.id ?? "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_time: "07:00",
      end_time: "16:00",
      dienstleister_id: dlQuery,
      dienstleister_name: dienstleisterListe.find((x) => x.id === dlQuery)?.firma,
    });
    setFormularSchluessel((k) => k + 1);
    setDialogOffen(true);
  }, [dlQuery, kalenderBereit, teamsListe, dienstleisterListe, router]);

  /** Zeilen = Projekte (Fundament); Einsätze sind Team-Chips im Projekt-Zeitraum. */
  const projektRessourcen = useMemo(() => {
    if (projekteAktiv.length === 0) {
      return [
        {
          id: "_leer",
          title: "Keine Projekte",
          extendedProps: {
            akzent: "#64748b",
            platzhalter: true,
            kunde: "",
          },
        },
      ];
    }
    const sorted = [...projekteAktiv].sort((a, b) => {
      const pa = prioRangUngeplant(a.priority ?? "normal");
      const pb = prioRangUngeplant(b.priority ?? "normal");
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title, "de");
    });
    return sorted.map((p) => {
      const prio = p.priority ?? "normal";
      const akzent =
        PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
      return {
        id: p.id,
        title: p.title,
        extendedProps: {
          akzent,
          kunde: p.customerLabel?.trim() || "",
          platzhalter: false,
        },
      };
    });
  }, [projekteAktiv]);

  const abwesenheitCountProTag = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const a of abwesenheiten) {
      let tage: Date[];
      try {
        tage = eachDayOfInterval({
          start: parseISO(a.start_date),
          end: parseISO(a.end_date),
        });
      } catch {
        continue;
      }
      for (const tag of tage) {
        const k = format(tag, "yyyy-MM-dd");
        acc[k] = (acc[k] ?? 0) + 1;
      }
    }
    return acc;
  }, [abwesenheiten]);

  const teamSidebarEintraege = useMemo(() => {
    return teamsListe.map((t) => ({
      id: t.id,
      name: t.name,
      farbe: t.farbe,
      abteilung: t.abteilung ?? null,
      mitglieder: mitgliederByTeam.get(t.id) ?? [],
    }));
  }, [teamsListe, mitgliederByTeam]);

  const einsaetzeProTeamZeitraum = useMemo(() => {
    if (!sichtbarerZeitraum) return {};
    const von = format(sichtbarerZeitraum.start, "yyyy-MM-dd");
    const bis = format(addDays(sichtbarerZeitraum.end, -1), "yyyy-MM-dd");
    const acc: Record<string, number> = {};
    for (const z of zuweisungen) {
      if (!z.team_id) continue;
      if (z.date < von || z.date > bis) continue;
      acc[z.team_id] = (acc[z.team_id] ?? 0) + 1;
    }
    return acc;
  }, [zuweisungen, sichtbarerZeitraum]);

  const heuteEinsaetzeAnzahl = useMemo(() => {
    const heuteStr = format(new Date(), "yyyy-MM-dd");
    return zuweisungen.filter((z) => z.date === heuteStr).length;
  }, [zuweisungen]);

  const heuteAbwesenheitenAnzahl = useMemo(() => {
    const heuteStr = format(new Date(), "yyyy-MM-dd");
    const ids = new Set<string>();
    for (const a of abwesenheiten) {
      if (heuteStr >= a.start_date && heuteStr <= a.end_date) {
        ids.add(a.employee_id);
      }
    }
    return ids.size;
  }, [abwesenheiten]);

  const teamFarbe = useCallback(
    (teamId: string | null) => {
      if (!teamId) return "#3b82f6";
      return teamsListe.find((t) => t.id === teamId)?.farbe ?? "#3b82f6";
    },
    [teamsListe]
  );

  const events: EventInput[] = useMemo(() => {
    return zuweisungen
      .filter((z) => z.project_id)
      .map((z) => {
        const pid = z.project_id as string;
        const tid = z.team_id as string | null;
        const dlName = z.dienstleister?.company_name;
        const farbe =
          z.teams?.farbe?.trim() ||
          (dlName ? "#a855f7" : teamFarbe(tid ?? ""));
        const teamName = dlName ?? z.teams?.name ?? "Einsatz";
        const hatKonflikt = tid
          ? teamHatKonflikt(
              tid,
              z.date,
              membersByTeam,
              abwesenheiten
            )
          : false;
        const start = z.start_time.slice(0, 5);
        const end = z.end_time.slice(0, 5);
        const ort = (z.ortLabel ?? "").trim();
        return {
          id: z.id,
          resourceId: pid,
          title: teamName,
          start: datumUndZeitZuIso(z.date, z.start_time),
          end: datumUndZeitZuIso(z.date, z.end_time),
          backgroundColor: "transparent",
          borderColor: "transparent",
          extendedProps: {
            zuweisung: z,
            hatKonflikt,
            teamFarbe: farbe,
            zeitLabel: `${start} – ${end}`,
            ortLabel: ort,
            teamName,
          },
        };
      });
  }, [zuweisungen, membersByTeam, abwesenheiten, teamFarbe]);

  function dialogNeuOeffnen(v: {
    date: string;
    team_id?: string;
    projekt_id?: string;
    start_time?: string;
    end_time?: string;
    dienstleister_id?: string;
    dienstleister_name?: string;
  }) {
    if (v.projekt_id === "_leer") {
      toast.info("Legen Sie zuerst Projekte an.");
      return;
    }
    if (v.dienstleister_id) {
      setBearbeiten(null);
      setVorgaben({
        team_id: v.team_id ?? teamsListe[0]?.id ?? "",
        date: v.date,
        start_time: v.start_time ?? "07:00",
        end_time: v.end_time ?? "16:00",
        projekt_id: v.projekt_id,
        dienstleister_id: v.dienstleister_id,
        dienstleister_name: v.dienstleister_name,
      });
      setFormularSchluessel((k) => k + 1);
      setDialogOffen(true);
      return;
    }
    let teamId = v.team_id;
    if (!teamId && teamsListe.length > 0) {
      teamId = teamsListe[0].id;
    }
    if (!teamId || teamId === "_leer") {
      toast.info("Legen Sie zuerst Teams an.");
      return;
    }
    setBearbeiten(null);
    setVorgaben({
      team_id: teamId,
      date: v.date,
      start_time: v.start_time ?? "07:00",
      end_time: v.end_time ?? "16:00",
      projekt_id: v.projekt_id,
    });
    setFormularSchluessel((k) => k + 1);
    setDialogOffen(true);
  }

  function onDateClick(info: DateClickArg) {
    const resource = (
      info as unknown as { resource?: { id: string } }
    ).resource;
    if (!resource?.id || resource.id === "_leer") {
      toast.info("Bitte eine Projekt-Zeile und einen Tag wählen.");
      return;
    }
    dialogNeuOeffnen({
      projekt_id: resource.id,
      team_id: teamsListe[0]?.id,
      date: format(info.date, "yyyy-MM-dd"),
      start_time: "07:00",
      end_time: "16:00",
    });
  }

  function onSelect(info: DateSelectArg) {
    const resource = (
      info as unknown as { resource?: { id: string } }
    ).resource;
    if (!resource?.id || resource.id === "_leer") {
      toast.info("Bitte in einer Projekt-Zeile auswählen.");
      return;
    }
    if (!info.start || !info.end) return;
    dialogNeuOeffnen({
      projekt_id: resource.id,
      team_id: teamsListe[0]?.id,
      date: format(info.start, "yyyy-MM-dd"),
      start_time: format(info.start, "HH:mm"),
      end_time: format(info.end, "HH:mm"),
    });
  }

  function onEventClick(info: EventClickArg) {
    if (info.event.display === "background") return;
    const z = info.event.extendedProps.zuweisung as EinsatzEvent | undefined;
    if (!z || (!z.team_id && !z.dienstleister_id)) return;
    const rect = info.el.getBoundingClientRect();
    setDetailZuweisung(z);
    setDetailPosition({ top: rect.bottom + 4, left: rect.left });
    setDetailOffen(true);
  }

  function bearbeitenAusDetail() {
    if (!detailZuweisung) return;
    const z = detailZuweisung;
    setVorgaben(null);
    setBearbeiten({
      id: z.id,
      employee_id: z.employee_id,
      project_id: z.project_id,
      team_id: z.team_id,
      dienstleister_id: z.dienstleister_id,
      date: z.date,
      start_time: z.start_time,
      end_time: z.end_time,
      notes: z.notes,
      prioritaet: z.prioritaet,
    });
    setFormularSchluessel((k) => k + 1);
    setDialogOffen(true);
  }

  async function loeschenAusDetail() {
    if (!detailZuweisung) return;
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", detailZuweisung.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Einsatz gelöscht.");
    void laden();
  }

  function onEventReceive(info: EventReceiveArg) {
    info.revert();
    const ep = info.event.extendedProps as {
      projektId?: string;
      projectId?: string;
      teamId?: string;
      typ?: string;
      dienstleisterId?: string;
    };
    const res = info.event.getResources()[0];
    const start = info.event.start;
    if (!start) return;

    if (ep?.typ === "dienstleister" && ep?.dienstleisterId) {
      if (!res?.id || res.id === "_leer") {
        toast.info("Auf eine Projekt-Zeile und Tag ziehen.");
        return;
      }
      dialogNeuOeffnen({
        projekt_id: res.id,
        dienstleister_id: ep.dienstleisterId,
        dienstleister_name: info.event.title,
        date: format(start, "yyyy-MM-dd"),
        start_time: "07:00",
        end_time: "16:00",
      });
      return;
    }

    const teamFromDrag = ep?.teamId;
    if (teamFromDrag) {
      if (!res?.id || res.id === "_leer") {
        toast.info("Auf eine Projekt-Zeile und Tag ziehen.");
        return;
      }
      dialogNeuOeffnen({
        projekt_id: res.id,
        team_id: teamFromDrag,
        date: format(start, "yyyy-MM-dd"),
        start_time: "07:00",
        end_time: "16:00",
      });
      return;
    }

    const projectId = ep?.projektId ?? ep?.projectId;
    if (!projectId) return;
    dialogNeuOeffnen({
      projekt_id: projectId,
      team_id: teamsListe[0]?.id,
      date: format(start, "yyyy-MM-dd"),
      start_time: "07:00",
      end_time: "16:00",
    });
  }

  async function beiDragOderResize(
    id: string,
    newProjectId: string,
    start: Date,
    ende: Date
  ) {
    if (newProjectId === "_leer") return false;
    const z = zuweisungen.find((x) => x.id === id);
    if (!z || (!z.team_id && !z.dienstleister_id)) return false;

    const datum = format(start, "yyyy-MM-dd");
    const startZeit = format(start, "HH:mm:ss");
    const endZeit = format(ende, "HH:mm:ss");

    let empId: string | null = null;
    if (z.team_id) {
      empId = await getRepresentativeEmployeeId(supabase, z.team_id);
      if (!empId) {
        toast.error("Kein Mitarbeiter für dieses Team hinterlegt.");
        return false;
      }
    } else {
      empId = z.employee_id;
    }

    const k = await pruefeEinsatzKonflikt(supabase, {
      mitarbeiterId: empId,
      datum,
      startZeit,
      endZeit,
      ausserhalbEinsatzId: id,
    });
    if (k.hatKonflikt) {
      toast.error(k.nachricht);
      return false;
    }

    const { error } = await supabase
      .from("assignments")
      .update({
        project_id: newProjectId,
        team_id: z.team_id,
        dienstleister_id: z.dienstleister_id,
        employee_id: empId,
        date: datum,
        start_time: startZeit,
        end_time: endZeit,
      })
      .eq("id", id);

    if (error) {
      toast.error("Fehler beim Verschieben");
      return false;
    }
    toast.success("Einsatz verschoben.");
    void laden();
    return true;
  }

  async function onEventDrop(info: EventDropArg) {
    if (info.event.display === "background") {
      info.revert();
      return;
    }
    const id = info.event.id;
    const res = info.event.getResources()[0];
    const start = info.event.start;
    const ende = info.event.end;
    if (!id || !res?.id || !start || !ende) {
      info.revert();
      return;
    }
    const ok = await beiDragOderResize(id, res.id as string, start, ende);
    if (!ok) info.revert();
  }

  async function onEventResize(info: EventResizeDoneArg) {
    if (info.event.display === "background") {
      info.revert();
      return;
    }
    const id = info.event.id;
    const res = info.event.getResources()[0];
    const start = info.event.start;
    const ende = info.event.end;
    if (!id || !res?.id || !start || !ende) {
      info.revert();
      return;
    }
    const ok = await beiDragOderResize(id, res.id as string, start, ende);
    if (!ok) info.revert();
  }

  function kalenderApi() {
    return calendarRef.current?.getApi();
  }

  function setzeAnsicht(art: "week" | "month") {
    setKalenderAnsicht(art);
    const api = kalenderApi();
    if (!api) return;
    if (art === "week") api.changeView("resourceTimelineWeek");
    else api.changeView("resourceTimelineMonth");
  }

  function onDatesSet(arg: DatesSetArg) {
    setSichtbarerZeitraum({ start: arg.start, end: arg.end });
    const start = arg.start;
    const end = addDays(arg.end, -1);
    if (kalenderAnsicht === "week") {
      setZeitraumLabel(
        `${format(start, "d.", { locale: de })} – ${format(end, "d. MMMM yyyy", { locale: de })}`
      );
    } else {
      setZeitraumLabel(format(start, "MMMM yyyy", { locale: de }));
    }
  }

  const typLabel = (t: string) => {
    const m: Record<string, string> = {
      urlaub: "Urlaub",
      krank: "Krank",
      fortbildung: "Fortbildung",
      sonstiges: "Sonstiges",
    };
    return m[t] ?? t;
  };

  const kalenderInhalt = !kalenderBereit ? (
    <div className="space-y-2 py-8">
      <Skeleton className="h-10 w-full bg-zinc-800" />
      <Skeleton className="h-64 w-full bg-zinc-800" />
    </div>
  ) : (
    <div className="fc-theme-standard h-full min-h-[420px] w-full min-w-0 overflow-x-auto">
      <FullCalendar
                ref={calendarRef}
                schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                plugins={[resourceTimelinePlugin, interactionPlugin]}
                locale={deLocale}
                initialView={
                  kalenderAnsicht === "week"
                    ? "resourceTimelineWeek"
                    : "resourceTimelineMonth"
                }
                views={{
                  resourceTimelineWeek: {
                    slotDuration: "24:00:00",
                    snapDuration: "24:00:00",
                    slotMinTime: "00:00:00",
                    slotMaxTime: "24:00:00",
                    slotLabelFormat: [],
                  },
                  resourceTimelineMonth: {
                    slotDuration: { days: 1 },
                    snapDuration: { days: 1 },
                    slotMinTime: "00:00:00",
                    slotMaxTime: "24:00:00",
                    slotLabelFormat: [],
                  },
                }}
                headerToolbar={false}
                height="auto"
                contentHeight="auto"
                resourceAreaWidth="28%"
                resourceAreaHeaderContent="Projekte"
                resources={projektRessourcen}
                slotLabelContent={(arg) => {
                  const d = arg.date;
                  if (!d) return null;
                  const iso = format(d, "yyyy-MM-dd");
                  const absN = abwesenheitCountProTag[iso] ?? 0;
                  const heute = isSameDay(d, new Date());
                  return (
                    <div
                      className={cn(
                        "flex min-w-[3rem] flex-col items-center gap-0.5 py-2",
                        heute && "rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30"
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        {format(d, "EEE", { locale: de })}
                      </span>
                      <span
                        className={cn(
                          "text-base font-bold tabular-nums",
                          heute ? "text-blue-400" : "text-zinc-100"
                        )}
                      >
                        {format(d, "d.", { locale: de })}
                      </span>
                      <span className="text-[9px] text-zinc-600">
                        {format(d, "MMM", { locale: de })}
                      </span>
                      {absN > 0 ? (
                        <span
                          className="mt-0.5 rounded-full bg-amber-500/20 px-1.5 py-px text-[9px] font-medium text-amber-400"
                          title="Abwesenheiten (Team-Mitglieder)"
                        >
                          {absN} abw.
                        </span>
                      ) : null}
                    </div>
                  );
                }}
                events={events}
                editable
                selectable
                selectMirror
                droppable
                eventOverlap
                datesSet={onDatesSet}
                dateClick={onDateClick}
                select={onSelect}
                eventClick={onEventClick}
                eventDrop={onEventDrop}
                eventResize={onEventResize}
                eventReceive={onEventReceive}
                eventStartEditable
                eventDurationEditable
                eventResourceEditable
                longPressDelay={200}
                slotLabelClassNames={(arg) => {
                  const d = arg.date;
                  if (d && isSameDay(d, new Date())) {
                    return ["fc-planung-heute-kopf"];
                  }
                  return [];
                }}
                eventContent={(arg) => {
                  if (arg.event.display === "background") return undefined;
                  const z = arg.event.extendedProps.zuweisung as
                    | EinsatzEvent
                    | undefined;
                  if (!z) return undefined;
                  const farbe =
                    (arg.event.extendedProps.teamFarbe as string) ||
                    teamFarbe(z.team_id);
                  const zeit =
                    (arg.event.extendedProps.zeitLabel as string) ?? "";
                  const ort =
                    (arg.event.extendedProps.ortLabel as string) ?? "";
                  const teamName =
                    (arg.event.extendedProps.teamName as string) ?? "";
                  const kritisch = istKritischUi(
                    z.prioritaet,
                    z.projects?.priority
                  );
                  const tip = [teamName, zeit, ort].filter(Boolean).join(" · ");
                  return (
                    <div
                      className="fc-planung-event-card flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-lg border border-white/[0.08] bg-gradient-to-b from-zinc-900/98 to-zinc-950/98 px-2 py-1.5 text-left shadow-lg shadow-black/50 ring-1 ring-white/[0.06] backdrop-blur-md"
                      style={{ borderLeftWidth: 3, borderLeftColor: farbe }}
                      title={tip}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[11px] font-semibold tracking-tight text-zinc-50">
                          {teamName}
                        </span>
                        {kritisch ? (
                          <Zap size={10} className="shrink-0 text-red-400" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] tabular-nums text-zinc-300">
                        <Clock className="size-2.5 shrink-0 opacity-80" />
                        <span>{zeit}</span>
                      </div>
                      {ort ? (
                        <div className="flex items-start gap-1 text-[9px] leading-snug text-zinc-500">
                          <MapPin className="mt-0.5 size-2.5 shrink-0 opacity-80" />
                          <span className="line-clamp-2">{ort}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                }}
                eventDidMount={(info) => {
                  if (info.event.display === "background") {
                    const name = info.event.extendedProps.abwName as
                      | string
                      | undefined;
                    const typ = info.event.extendedProps.abwTyp as
                      | string
                      | undefined;
                    if (name) {
                      info.el.setAttribute(
                        "title",
                        `Abwesenheit: ${name}, ${typLabel(typ ?? "")}`
                      );
                    }
                    return;
                  }
                  if (info.event.extendedProps.hatKonflikt) {
                    info.el.classList.add("border-2", "border-orange-400");
                  }
                }}
                resourceLabelContent={(arg) => {
                  const ep = arg.resource.extendedProps as {
                    akzent?: string;
                    platzhalter?: boolean;
                    kunde?: string;
                  };
                  const akzent = ep.akzent ?? "#64748b";
                  return (
                    <button
                      type="button"
                      className="group flex w-full min-w-0 items-start gap-2 rounded-r-md py-2 pl-2 pr-1 text-left transition-colors hover:bg-zinc-800/50"
                      style={{
                        borderLeft: `3px solid ${akzent}`,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (arg.resource.id === "_leer") return;
                        const api = kalenderApi();
                        const d = api?.getDate() ?? new Date();
                        dialogNeuOeffnen({
                          projekt_id: arg.resource.id,
                          team_id: teamsListe[0]?.id,
                          date: format(d, "yyyy-MM-dd"),
                          start_time: "07:00",
                          end_time: "16:00",
                        });
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold leading-tight text-zinc-100 group-hover:text-white">
                          {arg.resource.title}
                        </p>
                        {ep.platzhalter ? (
                          <p className="mt-0.5 text-[10px] text-zinc-600">
                            Projekt anlegen
                          </p>
                        ) : ep.kunde ? (
                          <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                            {ep.kunde}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[10px] text-zinc-600">
                            Einsatz planen
                          </p>
                        )}
                      </div>
                    </button>
                  );
                }}
              />
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col gap-0">
      <div className="flex shrink-0 flex-col gap-2 px-1 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs text-zinc-500">
          Zeilen = Projekte (Fundament): Projekt von links auf einen Tag ziehen,
          Team aus der rechten Leiste auf den Tag ziehen. Uhrzeit &amp; Ort auf
          den Karten. Orange Rand = Konflikt mit Abwesenheit.
        </p>
        <p className="text-xs text-zinc-500">
          <Link
            href="/teams?tab=projekte"
            className="font-medium text-blue-400 underline-offset-2 hover:underline"
          >
            Projekte anlegen
          </Link>{" "}
          ·{" "}
          <Link
            href="/teams?tab=teams"
            className="font-medium text-blue-400 underline-offset-2 hover:underline"
          >
            Teams verwalten
          </Link>
        </p>
      </div>

      <PlanungsToolbar
        zeitraumLabel={zeitraumLabel}
        ansicht={kalenderAnsicht}
        onAnsicht={setzeAnsicht}
        onPrev={() => kalenderApi()?.prev()}
        onNext={() => kalenderApi()?.next()}
        onHeute={() => kalenderApi()?.today()}
      />

      <ResizablePanelGroup
        id="planung-layout-v2"
        orientation="horizontal"
        defaultLayout={planungLayout}
        onLayoutChanged={planungLayoutChanged}
        className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
      >
        <ResizablePanel
          id="projekte-sidebar"
          defaultSize="18%"
          minSize="14%"
          maxSize="28%"
          collapsible
          className="flex min-h-0 min-w-0 flex-col"
        >
          <ProjekteSidebar
            projekte={ungeplanteProjekte}
            dienstleister={dienstleisterListe}
          />
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="w-px shrink-0 bg-zinc-800 transition-colors hover:bg-zinc-700 data-[resize-handle-active]:bg-blue-500"
        />

        <ResizablePanel
          id="kalender-mitte"
          defaultSize="64%"
          minSize="44%"
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <div
            className="planung-fc flex min-h-0 flex-1 flex-col bg-zinc-900 p-2 md:p-4"
            id="kalender-container"
          >
            {kalenderInhalt}
          </div>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="w-px shrink-0 bg-zinc-800 transition-colors hover:bg-zinc-700 data-[resize-handle-active]:bg-blue-500"
        />

        <ResizablePanel
          id="teams-sidebar"
          defaultSize="18%"
          minSize="14%"
          maxSize="28%"
          collapsible
          className="flex min-h-0 min-w-0 flex-col"
        >
          <TeamsSidebar
            teams={teamSidebarEintraege}
            einsaetzeProTeamZeitraum={einsaetzeProTeamZeitraum}
            heuteEinsaetze={heuteEinsaetzeAnzahl}
            heuteAbwesenheiten={heuteAbwesenheitenAnzahl}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EinsatzEventDetailFloating
          offen={detailOffen}
          zuweisung={detailZuweisung}
          position={detailPosition}
          onClose={() => setDetailOffen(false)}
          onBearbeiten={bearbeitenAusDetail}
          onLoeschen={() => void loeschenAusDetail()}
          loeschenOffen={loeschenDialogOffen}
          setLoeschenOffen={setLoeschenDialogOffen}
        />

        <EinsatzNeuDialog
          open={dialogOffen}
          onOpenChange={setDialogOffen}
          teams={teamsListe}
          projekte={projekteAktiv}
          dienstleister={dienstleisterListe.map((d) => ({
            id: d.id,
            firma: d.firma,
          }))}
          bearbeiten={bearbeiten}
          vorgaben={vorgaben}
          eigeneMitarbeiterId={eigeneMitarbeiterId}
          formularSchluessel={formularSchluessel}
          onGespeichert={() => void laden()}
        />
      </div>
  );
}
