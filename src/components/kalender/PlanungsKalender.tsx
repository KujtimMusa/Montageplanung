"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin, {
  Draggable,
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
  addHours,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  CheckCircle,
  FolderOpen,
  GripVertical,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { istKritischUi } from "@/lib/utils/priority";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import {
  EinsatzNeuDialog,
  type BearbeitenZuweisung,
  type ProjektOption,
  type TeamOption,
} from "@/components/kalender/EinsatzNeuDialog";
import { EinsatzEventDetailFloating } from "@/components/kalender/EinsatzEventDetail";
import type {
  AbwesenheitRow,
  EinsatzEvent,
  UngeplantesProjekt,
} from "@/types/planung";

function datumUndZeitZuIso(datum: string, zeit: string): string {
  const z = zeit.length === 5 ? `${zeit}:00` : zeit;
  return `${datum}T${z}`;
}

function einsatzTitel(z: EinsatzEvent): string {
  return (
    z.projects?.title ??
    (z.project_title?.trim() ? z.project_title.trim() : null) ??
    "Einsatz"
  );
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

const STATUS_BADGE: Record<string, string> = {
  neu: "bg-zinc-700 text-zinc-200",
  geplant: "bg-blue-900/50 text-blue-200",
  aktiv: "bg-emerald-900/40 text-emerald-200",
  abgeschlossen: "bg-zinc-800 text-zinc-400",
};

function statusLabel(s: string) {
  const m: Record<string, string> = {
    neu: "Neu",
    geplant: "Geplant",
    aktiv: "Aktiv",
    abgeschlossen: "Abgeschlossen",
  };
  return m[s] ?? s;
}

export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
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
  const [eigeneMitarbeiterId, setEigeneMitarbeiterId] = useState<string | null>(
    null
  );
  const [kalenderBereit, setKalenderBereit] = useState(false);

  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState<BearbeitenZuweisung | null>(null);
  const [vorgaben, setVorgaben] = useState<{
    team_id: string;
    date: string;
    start_time?: string;
    end_time?: string;
    projekt_id?: string;
  } | null>(null);
  const [formularSchluessel, setFormularSchluessel] = useState(0);

  const [sheetOffen, setSheetOffen] = useState(false);
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
        .select("id,name,farbe")
        .order("name");

      if (teamErr) {
        toast.error(`Teams konnten nicht geladen werden: ${teamErr.message}`);
        setTeamsListe([]);
      } else {
        setTeamsListe(
          (teamRows ?? []).map((t) => ({
            id: t.id as string,
            name: t.name as string,
            farbe: (t.farbe as string) ?? "#3b82f6",
          }))
        );
      }

      const teamIds = (teamRows ?? []).map((t) => t.id as string);

      const { data: tmRows } =
        teamIds.length > 0
          ? await supabase
              .from("team_members")
              .select("team_id,employee_id")
              .in("team_id", teamIds)
          : { data: [] as { team_id: string; employee_id: string }[] };

      const map = new Map<string, Set<string>>();
      for (const row of tmRows ?? []) {
        const tid = row.team_id as string;
        const eid = row.employee_id as string;
        if (!map.has(tid)) map.set(tid, new Set());
        map.get(tid)!.add(eid);
      }
      setMembersByTeam(map);

      const memberIds = Array.from(
        new Set((tmRows ?? []).map((r) => r.employee_id as string))
      );

      const projektSelect =
        "id,title,status,priority,planned_start,planned_end,customers(company_name)";

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

        function prioRang(prio: string): number {
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

        ungeplant.sort((a, b) => {
          const pa = prioRang((a.priority as string) ?? "normal");
          const pb = prioRang((b.priority as string) ?? "normal");
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

      const selectMitPrioritaet =
        "id,employee_id,project_id,project_title,team_id,date,start_time,end_time,notes,prioritaet, projects(title,priority), teams(name,farbe)";
      const selectOhnePrioritaet =
        "id,employee_id,project_id,project_title,team_id,date,start_time,end_time,notes, projects(title,priority), teams(name,farbe)";

      const zuQuery = await supabase
        .from("assignments")
        .select(selectMitPrioritaet)
        .not("team_id", "is", null);
      let zu: Record<string, unknown>[] = (zuQuery.data ??
        []) as Record<string, unknown>[];
      let zuErr = zuQuery.error;

      if (zuErr?.message?.includes("prioritaet") || zuErr?.code === "42703") {
        const r2 = await supabase
          .from("assignments")
          .select(selectOhnePrioritaet)
          .not("team_id", "is", null);
        zu = (r2.data ?? []) as Record<string, unknown>[];
        zuErr = r2.error;
      }

      if (zuErr) {
        toast.error(`Einsätze konnten nicht geladen werden: ${zuErr.message}`);
        setZuweisungen([]);
      } else {
        const normalisiert: EinsatzEvent[] = (zu ?? []).map((row) => {
          const p = row.projects as
            | { title?: string; priority?: string }
            | { title?: string; priority?: string }[]
            | null;
          const projekt = Array.isArray(p) ? p[0] : p;
          const t = row.teams as
            | { name?: string; farbe?: string }
            | { name?: string; farbe?: string }[]
            | null;
          const team = Array.isArray(t) ? t[0] : t;
          return {
            id: row.id as string,
            employee_id: row.employee_id as string,
            project_id: (row.project_id as string | null) ?? null,
            project_title: (row.project_title as string | null) ?? null,
            team_id: (row.team_id as string | null) ?? null,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            notes: (row.notes as string | null) ?? null,
            prioritaet: (row as { prioritaet?: string | null }).prioritaet ?? null,
            projects: projekt?.title
              ? {
                  title: projekt.title as string,
                  priority: projekt.priority as string | undefined,
                }
              : null,
            teams: team?.name
              ? { name: team.name as string, farbe: team.farbe as string | undefined }
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

  useEffect(() => {
    const el = document.getElementById("ungeplante-projekte-drag");
    if (!el || !sheetOffen) return;

    const d = new Draggable(el, {
      itemSelector: ".draggable-projekt",
      eventData: (dragEl: HTMLElement) => ({
        title: dragEl.getAttribute("data-title") ?? "Projekt",
        duration: "08:00",
        extendedProps: {
          projectId: dragEl.getAttribute("data-project-id") ?? "",
        },
      }),
    });

    return () => {
      d.destroy();
    };
  }, [sheetOffen, ungeplanteProjekte]);

  const ressourcen = useMemo(() => {
    if (teamsListe.length === 0) {
      return [
        {
          id: "_leer",
          title: "Noch keine Teams",
          extendedProps: { farbe: "#64748b", platzhalter: true },
        },
      ];
    }
    return teamsListe.map((t) => ({
      id: t.id,
      title: t.name,
      extendedProps: {
        farbe: t.farbe,
        mitglieder: membersByTeam.get(t.id)?.size ?? 0,
      },
    }));
  }, [teamsListe, membersByTeam]);

  const abwesenheitEvents: EventInput[] = useMemo(() => {
    const list: EventInput[] = [];
    for (const a of abwesenheiten) {
      for (const [teamId, members] of Array.from(membersByTeam.entries())) {
        if (!members.has(a.employee_id)) continue;
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
          const d = format(tag, "yyyy-MM-dd");
          list.push({
            id: `abw-bg-${teamId}-${a.employee_id}-${d}`,
            resourceId: teamId,
            display: "background",
            start: `${d}T00:00:00`,
            end: `${format(addDays(tag, 1), "yyyy-MM-dd")}T00:00:00`,
            color: "#ef444415",
            title: `${a.employee_name} abwesend`,
            extendedProps: {
              abwName: a.employee_name,
              abwTyp: a.type,
            },
          });
        }
      }
    }
    return list;
  }, [abwesenheiten, membersByTeam]);

  const teamFarbe = useCallback(
    (teamId: string | null) => {
      if (!teamId) return "#3b82f6";
      return teamsListe.find((t) => t.id === teamId)?.farbe ?? "#3b82f6";
    },
    [teamsListe]
  );

  const events: EventInput[] = useMemo(() => {
    const eins = zuweisungen.map((z) => {
      const tid = z.team_id as string;
      const farbe = z.teams?.farbe?.trim() || teamFarbe(tid);
      const titel = einsatzTitel(z);
      const hatKonflikt = teamHatKonflikt(
        tid,
        z.date,
        membersByTeam,
        abwesenheiten
      );
      return {
        id: z.id,
        resourceId: tid,
        title: titel,
        start: datumUndZeitZuIso(z.date, z.start_time),
        end: datumUndZeitZuIso(z.date, z.end_time),
        backgroundColor: "transparent",
        borderColor: "transparent",
        extendedProps: {
          zuweisung: z,
          hatKonflikt,
          teamFarbe: farbe,
        },
      };
    });
    return [...abwesenheitEvents, ...eins];
  }, [zuweisungen, abwesenheitEvents, membersByTeam, abwesenheiten, teamFarbe]);

  function dialogNeuOeffnen(v: {
    team_id: string;
    date: string;
    start_time?: string;
    end_time?: string;
    projekt_id?: string;
  }) {
    if (v.team_id === "_leer") {
      toast.info("Legen Sie zuerst Teams an.");
      return;
    }
    setBearbeiten(null);
    setVorgaben(v);
    setFormularSchluessel((k) => k + 1);
    setDialogOffen(true);
  }

  function onDateClick(info: DateClickArg) {
    const resource = (
      info as unknown as { resource?: { id: string } }
    ).resource;
    if (!resource?.id || resource.id === "_leer") {
      toast.info("Bitte eine Team-Zeile oder einen freien Slot wählen.");
      return;
    }
    dialogNeuOeffnen({
      team_id: resource.id,
      date: format(info.date, "yyyy-MM-dd"),
      start_time: "08:00",
      end_time: "16:00",
    });
  }

  function onSelect(info: DateSelectArg) {
    const resource = (
      info as unknown as { resource?: { id: string } }
    ).resource;
    if (!resource?.id || resource.id === "_leer") {
      toast.info("Bitte in einer Team-Zeile auswählen.");
      return;
    }
    if (!info.start || !info.end) return;
    dialogNeuOeffnen({
      team_id: resource.id,
      date: format(info.start, "yyyy-MM-dd"),
      start_time: format(info.start, "HH:mm"),
      end_time: format(info.end, "HH:mm"),
    });
  }

  function onEventClick(info: EventClickArg) {
    if (info.event.display === "background") return;
    const z = info.event.extendedProps.zuweisung as EinsatzEvent | undefined;
    if (!z || !z.team_id) return;
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
    const projectId = info.event.extendedProps?.projectId as string | undefined;
    const res = info.event.getResources()[0];
    const start = info.event.start;
    if (!projectId || !start) return;
    const teamId = res?.id;
    if (!teamId || teamId === "_leer") {
      toast.info("Bitte auf eine Team-Zeile im Kalender ziehen.");
      return;
    }
    dialogNeuOeffnen({
      team_id: teamId,
      date: format(start, "yyyy-MM-dd"),
      start_time: format(start, "HH:mm"),
      end_time: format(addHours(start, 8), "HH:mm"),
      projekt_id: projectId,
    });
  }

  async function beiDragOderResize(
    id: string,
    teamId: string,
    start: Date,
    ende: Date
  ) {
    const datum = format(start, "yyyy-MM-dd");
    const startZeit = format(start, "HH:mm:ss");
    const endZeit = format(ende, "HH:mm:ss");

    const empId = await getRepresentativeEmployeeId(supabase, teamId);
    if (!empId) {
      toast.error("Kein Mitarbeiter für dieses Team hinterlegt.");
      return false;
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
        team_id: teamId,
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
    const ok = await beiDragOderResize(id, res.id, start, ende);
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
    const ok = await beiDragOderResize(id, res.id, start, ende);
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

  return (
    <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-xs text-zinc-500">
            Teams als Zeilen: farbige Ränder, Einsätze per Drag zwischen Teams.
            Orange Umrandung: mögliche Überschneidung mit Team-Abwesenheit.
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

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            value={[kalenderAnsicht]}
            onValueChange={(v) => {
              const n = v[0];
              if (n === "week" || n === "month") setzeAnsicht(n);
            }}
            className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1"
          >
            <ToggleGroupItem value="week" className="data-[pressed]:bg-zinc-800">
              Woche
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="data-[pressed]:bg-zinc-800">
              Monat
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700"
              title="Vorheriger Zeitraum"
              onClick={() => kalenderApi()?.prev()}
            >
              ← Zurück
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700"
              onClick={() => kalenderApi()?.today()}
            >
              Heute
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700"
              title="Nächster Zeitraum"
              onClick={() => kalenderApi()?.next()}
            >
              Vor →
            </Button>
          </div>

          <div className="hidden min-w-0 flex-1 text-center text-sm font-medium text-zinc-300 md:block">
            {zeitraumLabel || "…"}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex md:hidden">
              <span className="truncate text-xs text-zinc-400">{zeitraumLabel}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-zinc-700"
              onClick={() => setSheetOffen(true)}
            >
              <FolderOpen className="mr-1 size-3.5" />
              Ungeplante Projekte
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {ungeplanteProjekte.length}
              </Badge>
            </Button>
            <Sheet open={sheetOffen} onOpenChange={setSheetOffen}>
              <SheetContent
                side="right"
                className="w-full max-w-md border-zinc-800 bg-zinc-950"
              >
                <SheetHeader>
                  <SheetTitle className="text-zinc-50">
                    Ungeplante Projekte
                  </SheetTitle>
                </SheetHeader>
                <p className="text-xs text-zinc-500">
                  Status &quot;geplant&quot;, kein Einsatz ab heute. Auf den Kalender
                  ziehen, um einen Termin anzulegen.
                </p>
                <ScrollArea className="mt-4 max-h-[70vh] pr-2">
                  <div id="ungeplante-projekte-drag" className="flex flex-col gap-2">
                    {ungeplanteProjekte.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <CheckCircle
                          className="size-8 text-emerald-500"
                          aria-hidden
                        />
                        <p className="text-sm font-medium text-zinc-300">
                          Alle Projekte sind eingeplant 🎉
                        </p>
                      </div>
                    ) : (
                      ungeplanteProjekte.map((p) => (
                        <div
                          key={p.id}
                          className="draggable-projekt relative cursor-grab rounded-xl border border-zinc-800 bg-zinc-900 p-3 active:cursor-grabbing"
                          data-project-id={p.id}
                          data-title={p.title}
                        >
                          <div className="flex justify-between gap-2 pr-6">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-100">
                                {p.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="secondary"
                                  className={
                                    STATUS_BADGE[p.status] ?? "bg-zinc-800"
                                  }
                                >
                                  {statusLabel(p.status)}
                                </Badge>
                                <span
                                  className="size-1.5 rounded-full bg-orange-500"
                                  title={p.priority}
                                />
                              </div>
                              {p.customerLabel ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {p.customerLabel}
                                </p>
                              ) : null}
                              {p.plannedStart || p.plannedEnd ? (
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {p.plannedStart && format(parseISO(p.plannedStart), "dd.MM.yy", { locale: de })}
                                  {p.plannedStart && p.plannedEnd ? " – " : ""}
                                  {p.plannedEnd && format(parseISO(p.plannedEnd), "dd.MM.yy", { locale: de })}
                                </p>
                              ) : null}
                            </div>
                            <GripVertical
                              className="absolute right-2 top-1/2 size-4 shrink-0 -translate-y-1/2 text-zinc-600"
                              aria-hidden
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="planung-fc rounded-lg border border-zinc-800 bg-zinc-900 p-2 md:p-4">
          {!kalenderBereit ? (
            <div className="space-y-2 py-8">
              <Skeleton className="h-10 w-full bg-zinc-800" />
              <Skeleton className="h-64 w-full bg-zinc-800" />
            </div>
          ) : (
            <div className="fc-theme-standard min-h-[480px] w-full overflow-x-auto">
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
                    slotLabelFormat: [
                      { weekday: "short" },
                      { day: "numeric", month: "numeric" },
                    ],
                  },
                  resourceTimelineMonth: {
                    slotDuration: "00:30:00",
                    slotMinTime: "05:00:00",
                    slotMaxTime: "21:00:00",
                    snapDuration: "00:15:00",
                  },
                }}
                headerToolbar={false}
                height="auto"
                contentHeight="auto"
                resourceAreaWidth="20%"
                resourceAreaHeaderContent="Teams"
                resources={ressourcen}
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
                  const kritisch = istKritischUi(
                    z.prioritaet,
                    z.projects?.priority
                  );
                  return (
                    <div
                      className="flex h-full w-full items-center gap-1.5 overflow-hidden rounded-md px-2 py-1"
                      style={{
                        backgroundColor: `${farbe}25`,
                        borderLeft: `3px solid ${farbe}`,
                      }}
                    >
                      <span className="truncate text-xs font-medium text-white">
                        {arg.event.title}
                      </span>
                      {kritisch ? (
                        <Zap size={10} className="shrink-0 text-red-400" />
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
                    farbe?: string;
                    platzhalter?: boolean;
                    mitglieder?: number;
                  };
                  const n = ep.mitglieder ?? 0;
                  return (
                    <button
                      type="button"
                      className="flex w-full min-w-0 flex-col items-stretch rounded-sm px-1 py-1 text-left hover:bg-zinc-800/60"
                      style={{
                        borderLeft: `3px solid ${ep.farbe ?? "#64748b"}`,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const api = kalenderApi();
                        const d = api?.getDate() ?? new Date();
                        dialogNeuOeffnen({
                          team_id: arg.resource.id,
                          date: format(d, "yyyy-MM-dd"),
                          start_time: "08:00",
                          end_time: "16:00",
                        });
                      }}
                    >
                      <span className="truncate text-sm font-medium text-zinc-200">
                        {arg.resource.title}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {ep.platzhalter ? "—" : `${n} Mitglieder`}
                      </span>
                    </button>
                  );
                }}
              />
            </div>
          )}
        </div>

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
          bearbeiten={bearbeiten}
          vorgaben={vorgaben}
          eigeneMitarbeiterId={eigeneMitarbeiterId}
          formularSchluessel={formularSchluessel}
          onGespeichert={() => void laden()}
        />
      </div>
  );
}
