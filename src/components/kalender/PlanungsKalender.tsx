"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventInput } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import { addDays, eachDayOfInterval, format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MitarbeiterZeile = {
  id: string;
  name: string;
  abteilungsFarbe: string;
  department_id: string | null;
};

type AbteilungOpt = { id: string; name: string; color: string };

type ProjektOpt = { id: string; title: string };

type ZuweisungRow = {
  id: string;
  employee_id: string;
  project_id: string | null;
  project_title: string | null;
  date: string;
  start_time: string;
  end_time: string;
  role: string | null;
  notes: string | null;
  projects: { title: string } | null;
};

type AbwesenheitRow = {
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
};

function abwesenheitFarbe(typ: string): string {
  const t = typ.toLowerCase();
  if (t.includes("krank")) return "rgba(220, 38, 38, 0.35)";
  if (t.includes("fort") || t.includes("bildung")) return "rgba(37, 99, 235, 0.3)";
  return "rgba(113, 113, 122, 0.45)";
}

function datumUndZeitZuIso(datum: string, zeit: string): string {
  const z = zeit.length === 5 ? `${zeit}:00` : zeit;
  return `${datum}T${z}`;
}

function normalisiereUhrzeit(eingabe: string): string {
  const e = eingabe.trim();
  if (/^\d{1,2}:\d{2}$/.test(e)) {
    const [h, m] = e.split(":");
    return `${h!.padStart(2, "0")}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(e)) {
    const [h, m, s] = e.split(":");
    return `${h!.padStart(2, "0")}:${m}:${s!.padStart(2, "0")}`;
  }
  return "08:00:00";
}

function einsatzTitel(z: ZuweisungRow): string {
  if (z.projects?.title) return z.projects.title;
  if (z.project_title?.trim()) return z.project_title.trim();
  return "Einsatz";
}

function liegtAufAbwesenheit(
  z: ZuweisungRow,
  abwesenheiten: AbwesenheitRow[]
): boolean {
  return abwesenheiten.some(
    (a) =>
      a.employee_id === z.employee_id &&
      z.date >= a.start_date &&
      z.date <= a.end_date
  );
}

/**
 * Planungskalender: Resource Timeline, Filter, Drag & Drop, optionales Projekt.
 */
export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
  const [mitarbeiter, setMitarbeiter] = useState<MitarbeiterZeile[]>([]);
  const [abteilungen, setAbteilungen] = useState<AbteilungOpt[]>([]);
  const [filterAbteilung, setFilterAbteilung] = useState<string>("alle");
  const [projekte, setProjekte] = useState<ProjektOpt[]>([]);
  const [zuweisungen, setZuweisungen] = useState<ZuweisungRow[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<AbwesenheitRow[]>([]);
  const [eigeneMitarbeiterId, setEigeneMitarbeiterId] = useState<string | null>(
    null
  );
  const [integration, setIntegration] = useState<{
    outlook: boolean;
    whatsapp: boolean;
  }>({ outlook: false, whatsapp: false });

  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [konfliktText, setKonfliktText] = useState<string | null>(null);

  const [formMitarbeiterId, setFormMitarbeiterId] = useState("");
  const [formProjektId, setFormProjektId] = useState("");
  const [formProjektFreitext, setFormProjektFreitext] = useState("");
  const [formDatum, setFormDatum] = useState("");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnde, setFormEnde] = useState("16:00");
  const [formRolle, setFormRolle] = useState("Teamleiter");
  const [formNotiz, setFormNotiz] = useState("");
  const [speichernLaedt, setSpeichernLaedt] = useState(false);

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

      const [{ data: ma }, { data: deps }] = await Promise.all([
        supabase
          .from("employees")
          .select("id,name,department_id")
          .eq("active", true)
          .order("name"),
        supabase.from("departments").select("id,name,color").order("name"),
      ]);

      const depMap = Object.fromEntries(
        (deps ?? []).map((d) => [d.id, d.color as string])
      );

      setAbteilungen(
        (deps ?? []).map((d) => ({
          id: d.id as string,
          name: d.name as string,
          color: (d.color as string) ?? "#64748b",
        }))
      );

      setMitarbeiter(
        (ma ?? []).map((m) => ({
          id: m.id,
          name: m.name,
          department_id: (m.department_id as string | null) ?? null,
          abteilungsFarbe: m.department_id
            ? depMap[m.department_id] ?? "#64748b"
            : "#64748b",
        }))
      );

      const { data: pr, error: prErr } = await supabase
        .from("projects")
        .select("id,title")
        .order("title");
      if (prErr) {
        toast.error(`Projekte konnten nicht geladen werden: ${prErr.message}`);
        setProjekte([]);
      } else {
        setProjekte(pr ?? []);
      }

      const { data: zu, error: zuErr } = await supabase
        .from("assignments")
        .select(
          "id,employee_id,project_id,project_title,date,start_time,end_time,role,notes, projects(title)"
        );

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
          return {
            id: row.id as string,
            employee_id: row.employee_id as string,
            project_id: (row.project_id as string | null) ?? null,
            project_title: (row.project_title as string | null) ?? null,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            role: row.role as string | null,
            notes: row.notes as string | null,
            projects: projekt?.title ? { title: projekt.title as string } : null,
          };
        });
        setZuweisungen(normalisiert);
      }

      const { data: abw, error: abwErr } = await supabase
        .from("absences")
        .select("employee_id,type,start_date,end_date");

      if (abwErr) {
        setAbwesenheiten([]);
      } else {
        setAbwesenheiten((abw ?? []) as AbwesenheitRow[]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.error(`Kalenderdaten konnten nicht geladen werden: ${msg}`);
    }
  }, [supabase]);

  useEffect(() => {
    void fetch("/api/integrationen/status")
      .then((r) => r.json())
      .then((j: { outlook?: boolean; whatsapp?: boolean }) =>
        setIntegration({
          outlook: Boolean(j.outlook),
          whatsapp: Boolean(j.whatsapp),
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  useEffect(() => {
    const kanal = supabase
      .channel("kalender-realtime")
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
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [supabase, laden]);

  const gefilterteMitarbeiter = useMemo(() => {
    if (filterAbteilung === "alle") return mitarbeiter;
    return mitarbeiter.filter((m) => m.department_id === filterAbteilung);
  }, [mitarbeiter, filterAbteilung]);

  const ressourcen = useMemo(() => {
    if (gefilterteMitarbeiter.length === 0) {
      return [
        {
          id: "_leer",
          title:
            mitarbeiter.length === 0
              ? "Noch keine Mitarbeiter"
              : "Keine Mitarbeiter in dieser Abteilung",
          extendedProps: { abteilungsFarbe: "#64748b", platzhalter: true },
        },
      ];
    }
    return gefilterteMitarbeiter.map((m) => ({
      id: m.id,
      title: m.name,
      extendedProps: { abteilungsFarbe: m.abteilungsFarbe },
    }));
  }, [gefilterteMitarbeiter, mitarbeiter.length]);

  const abwesenheitEvents: EventInput[] = useMemo(() => {
    const list: EventInput[] = [];
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
        const d = format(tag, "yyyy-MM-dd");
        list.push({
          id: `abw-${a.employee_id}-${d}-${a.type}`,
          resourceId: a.employee_id,
          display: "background",
          start: `${d}T00:00:00`,
          end: `${format(addDays(tag, 1), "yyyy-MM-dd")}T00:00:00`,
          color: abwesenheitFarbe(a.type),
          title: a.type,
        });
      }
    }
    return list;
  }, [abwesenheiten]);

  const events: EventInput[] = useMemo(() => {
    const eins = zuweisungen.map((z) => {
      const farbe =
        mitarbeiter.find((m) => m.id === z.employee_id)?.abteilungsFarbe ??
        "#3b82f6";
      const titel = einsatzTitel(z);
      const konflikt = liegtAufAbwesenheit(z, abwesenheiten);
      return {
        id: z.id,
        resourceId: z.employee_id,
        title: titel,
        start: datumUndZeitZuIso(z.date, z.start_time),
        end: datumUndZeitZuIso(z.date, z.end_time),
        backgroundColor: farbe,
        borderColor: konflikt ? "#ef4444" : farbe,
        classNames: konflikt ? ["fc-event-konflikt"] : undefined,
        extendedProps: { zuweisung: z },
      };
    });
    return [...abwesenheitEvents, ...eins];
  }, [zuweisungen, mitarbeiter, abwesenheitEvents, abwesenheiten]);

  function dialogZuruecksetzen() {
    setBearbeitenId(null);
    setKonfliktText(null);
    setFormMitarbeiterId("");
    setFormProjektId("");
    setFormProjektFreitext("");
    setFormDatum("");
    setFormStart("08:00");
    setFormEnde("16:00");
    setFormRolle("Teamleiter");
    setFormNotiz("");
  }

  function dialogOeffnenFuerNeu(
    mitarbeiterId: string,
    start: Date,
    ende: Date
  ) {
    dialogZuruecksetzen();
    setBearbeitenId(null);
    setFormMitarbeiterId(mitarbeiterId);
    setFormDatum(format(start, "yyyy-MM-dd"));
    setFormStart(format(start, "HH:mm"));
    setFormEnde(format(ende, "HH:mm"));
    setDialogOffen(true);
  }

  function dialogOeffnenBearbeiten(z: ZuweisungRow) {
    setBearbeitenId(z.id);
    setFormMitarbeiterId(z.employee_id);
    setFormProjektId(z.project_id ?? "");
    setFormProjektFreitext(z.project_title ?? "");
    setFormDatum(z.date);
    setFormStart(z.start_time.slice(0, 5));
    setFormEnde(z.end_time.slice(0, 5));
    setFormRolle(z.role ?? "Teamleiter");
    setFormNotiz(z.notes ?? "");
    setKonfliktText(null);
    setDialogOffen(true);
  }

  function projektPayload(): {
    project_id: string | null;
    project_title: string | null;
  } {
    const ft = formProjektFreitext.trim();
    if (formProjektId && formProjektId !== "__frei__") {
      return { project_id: formProjektId, project_title: null };
    }
    if (ft) return { project_id: null, project_title: ft };
    return { project_id: null, project_title: null };
  }

  async function speichern() {
    if (!formMitarbeiterId || !formDatum) {
      toast.error("Mitarbeiter und Datum sind erforderlich.");
      return;
    }

    const normStart = normalisiereUhrzeit(formStart);
    const normEnde = normalisiereUhrzeit(formEnde);

    setSpeichernLaedt(true);
    setKonfliktText(null);

    const k = await pruefeEinsatzKonflikt(supabase, {
      mitarbeiterId: formMitarbeiterId,
      datum: formDatum,
      startZeit: normStart,
      endZeit: normEnde,
      ausserhalbEinsatzId: bearbeitenId ?? undefined,
    });

    if (k.hatKonflikt) {
      setKonfliktText(k.nachricht);
      setSpeichernLaedt(false);
      return;
    }

    const { project_id, project_title } = projektPayload();

    if (bearbeitenId) {
      const { error } = await supabase
        .from("assignments")
        .update({
          employee_id: formMitarbeiterId,
          project_id,
          project_title,
          date: formDatum,
          start_time: normStart,
          end_time: normEnde,
          role: formRolle,
          notes: formNotiz || null,
        })
        .eq("id", bearbeitenId);
      setSpeichernLaedt(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const payload: Record<string, unknown> = {
        employee_id: formMitarbeiterId,
        project_id,
        project_title,
        date: formDatum,
        start_time: normStart,
        end_time: normEnde,
        role: formRolle,
        notes: formNotiz || null,
      };
      if (eigeneMitarbeiterId) payload.created_by = eigeneMitarbeiterId;

      const { error } = await supabase.from("assignments").insert(payload);
      setSpeichernLaedt(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    }

    toast.success("Einsatz gespeichert.");
    setDialogOffen(false);
    dialogZuruecksetzen();
    void laden();
  }

  async function loeschen() {
    if (!bearbeitenId) return;
    setSpeichernLaedt(true);
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", bearbeitenId);
    setSpeichernLaedt(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Einsatz gelöscht.");
    setDialogOffen(false);
    dialogZuruecksetzen();
    void laden();
  }

  async function beiDragOderResize(
    id: string,
    mitarbeiterId: string,
    start: Date,
    ende: Date
  ) {
    const datum = format(start, "yyyy-MM-dd");
    const startZeit = format(start, "HH:mm:ss");
    const endZeit = format(ende, "HH:mm:ss");

    const k = await pruefeEinsatzKonflikt(supabase, {
      mitarbeiterId,
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
        employee_id: mitarbeiterId,
        date: datum,
        start_time: startZeit,
        end_time: endZeit,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Einsatz verschoben.");
    void laden();
    return true;
  }

  function onSelect(info: DateSelectArg) {
    const res = info.resource;
    if (!res?.id) {
      toast.info("Bitte einen Bereich in der Zeile eines Mitarbeiters wählen.");
      return;
    }
    if (String(res.id) === "_leer") {
      toast.info(
        "Lege Mitarbeiter an oder passe den Abteilungsfilter an, damit Zeilen sichtbar sind."
      );
      return;
    }
    if (!info.start || !info.end) return;
    dialogOeffnenFuerNeu(res.id, info.start, info.end);
  }

  function onEventClick(info: EventClickArg) {
    if (info.event.display === "background") return;
    const z = info.event.extendedProps.zuweisung as ZuweisungRow | undefined;
    if (z) dialogOeffnenBearbeiten(z);
  }

  async function onEventDrop(info: EventDropArg) {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          Rote Umrandung: Einsatz liegt während einer Abwesenheit (Urlaub/Krank)
          — bitte prüfen.
        </p>
      </div>

      <Tabs
        value={filterAbteilung}
        onValueChange={setFilterAbteilung}
        className="w-full"
      >
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 bg-zinc-900 p-1">
          <TabsTrigger
            value="alle"
            className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
          >
            Alle Abteilungen
          </TabsTrigger>
          {abteilungen.map((a) => (
            <TabsTrigger
              key={a.id}
              value={a.id}
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
            >
              <span
                className="mr-2 inline-block size-2 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              {a.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="planung-fc rounded-lg border border-zinc-800 bg-zinc-900 p-2 md:p-4">
        <div className="fc-theme-standard min-h-[480px] w-full overflow-x-auto">
          <FullCalendar
            schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            locale={deLocale}
            initialView="resourceTimelineWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right:
                "resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth",
            }}
            slotMinTime="05:00:00"
            slotMaxTime="21:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            height="auto"
            contentHeight={560}
            resourceAreaWidth="28%"
            resources={ressourcen}
            events={events}
            editable
            selectable
            selectMirror
            eventOverlap
            select={onSelect}
            eventClick={onEventClick}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
            eventStartEditable
            eventDurationEditable
            resourceLabelContent={(arg) => (
              <div className="flex items-center gap-2 py-1">
                <span
                  className="inline-block h-8 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      (arg.resource.extendedProps as { abteilungsFarbe?: string })
                        ?.abteilungsFarbe ?? "#64748b",
                  }}
                />
                <span className="truncate text-sm font-medium text-zinc-100">
                  {arg.resource.title}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      <Dialog
        open={dialogOffen}
        onOpenChange={(o) => {
          setDialogOffen(o);
          if (!o) dialogZuruecksetzen();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-700 bg-zinc-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">
              {bearbeitenId ? "Einsatz bearbeiten" : "Neuer Einsatz"}
            </DialogTitle>
          </DialogHeader>

          {konfliktText && (
            <Alert variant="destructive" className="border-red-900 bg-red-950/40">
              <AlertTitle>Konflikt</AlertTitle>
              <AlertDescription>{konfliktText}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Mitarbeiter</Label>
              <Select
                value={formMitarbeiterId}
                onValueChange={(v) => setFormMitarbeiterId(v ?? "")}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950">
                  <SelectValue placeholder="Wählen" />
                </SelectTrigger>
                <SelectContent>
                  {mitarbeiter.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Projekt (optional)</Label>
              <Select
                value={
                  formProjektId && formProjektId !== "__frei__"
                    ? formProjektId
                    : "__frei__"
                }
                onValueChange={(v) => {
                  if (v === "__frei__") {
                    setFormProjektId("");
                  } else {
                    setFormProjektId(v ?? "");
                    setFormProjektFreitext("");
                  }
                }}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950">
                  <SelectValue placeholder="Aus Liste oder Freitext unten" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__frei__">— Freitext / kein Projekt</SelectItem>
                  {projekte.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Oder Projektbezeichnung frei eingeben"
                value={formProjektFreitext}
                onChange={(e) => {
                  setFormProjektFreitext(e.target.value);
                  if (e.target.value.trim()) setFormProjektId("");
                }}
                className="border-zinc-700 bg-zinc-950 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="einsatz-datum" className="text-zinc-300">
                Datum
              </Label>
              <Input
                id="einsatz-datum"
                type="date"
                value={formDatum}
                onChange={(e) => setFormDatum(e.target.value)}
                className="border-zinc-700 bg-zinc-950"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="einsatz-start" className="text-zinc-300">
                  Start
                </Label>
                <Input
                  id="einsatz-start"
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="border-zinc-700 bg-zinc-950"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="einsatz-ende" className="text-zinc-300">
                  Ende
                </Label>
                <Input
                  id="einsatz-ende"
                  type="time"
                  value={formEnde}
                  onChange={(e) => setFormEnde(e.target.value)}
                  className="border-zinc-700 bg-zinc-950"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Rolle vor Ort (optional)</Label>
              <Select
                value={formRolle}
                onValueChange={(v) => setFormRolle(v ?? "Teamleiter")}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teamleiter">Teamleiter</SelectItem>
                  <SelectItem value="Helfer">Helfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="einsatz-notiz" className="text-zinc-300">
                Notiz
              </Label>
              <Textarea
                id="einsatz-notiz"
                value={formNotiz}
                onChange={(e) => setFormNotiz(e.target.value)}
                rows={2}
                placeholder="Optional"
                className="border-zinc-700 bg-zinc-950 text-zinc-100"
              />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
              <span className="w-full text-xs font-medium text-zinc-500">
                Benachrichtigungen (nach dem Speichern manuell)
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!integration.outlook}
                title={
                  integration.outlook
                    ? "Outlook-Termin anlegen"
                    : "Outlook nicht konfiguriert (AZURE_CLIENT_ID)"
                }
                className={cn(!integration.outlook && "opacity-50")}
                onClick={() =>
                  integration.outlook &&
                  toast.info("Outlook-Sync ist noch ein Platzhalter.")
                }
              >
                Outlook
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!integration.whatsapp}
                title={
                  integration.whatsapp
                    ? "WhatsApp an Mitarbeiter"
                    : "WhatsApp nicht konfiguriert (Twilio)"
                }
                className={cn(!integration.whatsapp && "opacity-50")}
                onClick={() =>
                  integration.whatsapp &&
                  toast.info("WhatsApp-Versand folgt bei Twilio-Konfiguration.")
                }
              >
                WhatsApp
              </Button>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {bearbeitenId && (
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:mr-auto sm:w-auto"
                onClick={() => void loeschen()}
                disabled={speichernLaedt}
              >
                Löschen
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOffen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => void speichern()}
              disabled={speichernLaedt}
            >
              {speichernLaedt ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
