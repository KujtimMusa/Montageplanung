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
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import deLocale from "@fullcalendar/core/locales/de";
import { addDays, addHours, eachDayOfInterval, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  EinsatzNeuDialog,
  type BearbeitenZuweisung,
  type ProjektOption,
  type TeamOption,
} from "@/components/kalender/EinsatzNeuDialog";

type ZuweisungRow = {
  id: string;
  employee_id: string;
  project_id: string | null;
  project_title: string | null;
  team_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  projects: { title: string } | null;
  teams: { name: string; farbe?: string | null } | null;
};

type AbwesenheitRow = {
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
};

function datumUndZeitZuIso(datum: string, zeit: string): string {
  const z = zeit.length === 5 ? `${zeit}:00` : zeit;
  return `${datum}T${z}`;
}

function einsatzTitel(z: ZuweisungRow): string {
  const basis =
    z.projects?.title ??
    (z.project_title?.trim() ? z.project_title.trim() : null) ??
    "Einsatz";
  return basis;
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

export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
  const calendarRef = useRef<FullCalendar>(null);
  const [teamsListe, setTeamsListe] = useState<TeamOption[]>([]);
  const [zuweisungen, setZuweisungen] = useState<ZuweisungRow[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<AbwesenheitRow[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<Map<string, Set<string>>>(
    () => new Map()
  );
  const [projekteAktiv, setProjekteAktiv] = useState<ProjektOption[]>([]);
  const [ungeplanteProjekte, setUngeplanteProjekte] = useState<ProjektOption[]>(
    []
  );
  const [eigeneMitarbeiterId, setEigeneMitarbeiterId] = useState<string | null>(
    null
  );

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

      const { data: pr, error: prErr } = await supabase
        .from("projects")
        .select("id,title")
        .neq("status", "abgeschlossen")
        .order("title");

      if (prErr) {
        toast.error(`Projekte konnten nicht geladen werden: ${prErr.message}`);
        setProjekteAktiv([]);
      } else {
        setProjekteAktiv((pr ?? []) as ProjektOption[]);
      }

      const heute = format(new Date(), "yyyy-MM-dd");

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

      const { data: geplantRows } = await supabase
        .from("projects")
        .select("id,title")
        .eq("status", "geplant")
        .order("title");

      const ungeplant = (geplantRows ?? []).filter(
        (p) => !busyIds.has(p.id as string)
      ) as ProjektOption[];
      setUngeplanteProjekte(ungeplant);

      const { data: zu, error: zuErr } = await supabase
        .from("assignments")
        .select(
          "id,employee_id,project_id,project_title,team_id,date,start_time,end_time,notes, projects(title), teams(name,farbe)"
        )
        .not("team_id", "is", null);

      if (zuErr) {
        toast.error(`Einsätze konnten nicht geladen werden: ${zuErr.message}`);
        setZuweisungen([]);
      } else {
        const normalisiert: ZuweisungRow[] = (zu ?? []).map((row) => {
          const p = row.projects as
            | { title?: string }
            | { title?: string }[]
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
            projects: projekt?.title ? { title: projekt.title as string } : null,
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
          .select("employee_id,start_date,end_date,employees(name)")
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
            };
          });
          setAbwesenheiten(list);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Kalenderdaten konnten nicht geladen werden: ${msg}`);
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
      extendedProps: { farbe: t.farbe },
    }));
  }, [teamsListe]);

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
            color: "#ef444420",
            title: `${a.employee_name} abwesend`,
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
        backgroundColor: farbe,
        borderColor: farbe,
        extendedProps: { zuweisung: z, hatKonflikt },
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
    const z = info.event.extendedProps.zuweisung as ZuweisungRow | undefined;
    if (!z || !z.team_id) return;
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
    });
    setFormularSchluessel((k) => k + 1);
    setDialogOffen(true);
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
        <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
          <Button
            type="button"
            size="sm"
            variant={kalenderAnsicht === "week" ? "secondary" : "ghost"}
            className="h-8"
            onClick={() => setzeAnsicht("week")}
          >
            Woche
          </Button>
          <Button
            type="button"
            size="sm"
            variant={kalenderAnsicht === "month" ? "secondary" : "ghost"}
            className="h-8"
            onClick={() => setzeAnsicht("month")}
          >
            Monat
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-zinc-700"
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
          onClick={() => kalenderApi()?.next()}
        >
          Vor →
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={() => setSheetOffen(true)}
          >
            Ungeplante Projekte
          </Button>
          <Sheet open={sheetOffen} onOpenChange={setSheetOffen}>
            <SheetContent side="right" className="w-full max-w-md border-zinc-800 bg-zinc-950">
              <SheetHeader>
                <SheetTitle className="text-zinc-50">
                  Ungeplante Projekte
                </SheetTitle>
              </SheetHeader>
              <p className="text-xs text-zinc-500">
                Status &quot;geplant&quot;, kein Einsatz ab heute. Auf den Kalender
                ziehen, um einen Termin anzulegen.
              </p>
              <div
                id="ungeplante-projekte-drag"
                className="mt-4 flex max-h-[70vh] flex-col gap-2 overflow-y-auto pr-1"
              >
                {ungeplanteProjekte.length === 0 ? (
                  <p className="text-sm text-zinc-500">Keine ungeplanten Projekte.</p>
                ) : (
                  ungeplanteProjekte.map((p) => (
                    <Card
                      key={p.id}
                      className="draggable-projekt cursor-grab border-zinc-800 bg-zinc-900 active:cursor-grabbing"
                      data-project-id={p.id}
                      data-title={p.title}
                    >
                      <CardContent className="p-3 text-sm text-zinc-100">
                        {p.title}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="planung-fc rounded-lg border border-zinc-800 bg-zinc-900 p-2 md:p-4">
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
            headerToolbar={false}
            slotMinTime="05:00:00"
            slotMaxTime="21:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            height="auto"
            contentHeight={560}
            resourceAreaWidth="28%"
            resourceAreaHeaderContent="Teams"
            resources={ressourcen}
            events={events}
            editable
            selectable
            selectMirror
            droppable
            eventOverlap
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
            eventDidMount={(info) => {
              if (info.event.display === "background") return;
              if (info.event.extendedProps.hatKonflikt) {
                info.el.classList.add("border-2", "border-orange-400");
              }
            }}
            resourceLabelContent={(arg) => (
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-2 rounded-sm px-0 py-1 text-left hover:bg-zinc-800/60"
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
                <span
                  className="inline-block h-8 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      (arg.resource.extendedProps as { farbe?: string }).farbe ??
                      "#64748b",
                  }}
                />
                <span className="truncate text-sm font-medium text-zinc-100">
                  {arg.resource.title}
                </span>
              </button>
            )}
          />
        </div>
      </div>

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
