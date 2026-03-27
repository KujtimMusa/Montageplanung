"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventInput } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import { format } from "date-fns";
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
import { toast } from "sonner";

type MitarbeiterZeile = {
  id: string;
  name: string;
  abteilungsFarbe: string;
};

type ProjektOpt = { id: string; title: string };

type ZuweisungRow = {
  id: string;
  employee_id: string;
  project_id: string;
  date: string;
  start_time: string;
  end_time: string;
  role: string | null;
  notes: string | null;
  projects: { title: string } | null;
};

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

/**
 * Planungskalender: Resource Timeline, Drag & Drop, Dialoge, Realtime.
 */
export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
  const [mitarbeiter, setMitarbeiter] = useState<MitarbeiterZeile[]>([]);
  const [projekte, setProjekte] = useState<ProjektOpt[]>([]);
  const [zuweisungen, setZuweisungen] = useState<ZuweisungRow[]>([]);
  const [eigeneMitarbeiterId, setEigeneMitarbeiterId] = useState<string | null>(
    null
  );

  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeitenId, setBearbeitenId] = useState<string | null>(null);
  const [konfliktText, setKonfliktText] = useState<string | null>(null);

  const [formMitarbeiterId, setFormMitarbeiterId] = useState("");
  const [formProjektId, setFormProjektId] = useState("");
  const [formDatum, setFormDatum] = useState("");
  const [formStart, setFormStart] = useState("08:00");
  const [formEnde, setFormEnde] = useState("16:00");
  const [formRolle, setFormRolle] = useState("Teamleiter");
  const [formNotiz, setFormNotiz] = useState("");
  const [speichernLaedt, setSpeichernLaedt] = useState(false);

  const laden = useCallback(async () => {
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
      supabase.from("departments").select("id,color"),
    ]);

    const depMap = Object.fromEntries(
      (deps ?? []).map((d) => [d.id, d.color as string])
    );

    setMitarbeiter(
      (ma ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        abteilungsFarbe: m.department_id
          ? depMap[m.department_id] ?? "#64748b"
          : "#64748b",
      }))
    );

    const { data: pr } = await supabase
      .from("projects")
      .select("id,title")
      .order("title");
    setProjekte(pr ?? []);

    const { data: zu } = await supabase
      .from("assignments")
      .select(
        "id,employee_id,project_id,date,start_time,end_time,role,notes, projects(title)"
      );

    const normalisiert: ZuweisungRow[] = (zu ?? []).map((row) => {
      const p = row.projects as { title?: string } | { title?: string }[] | null;
      const projekt = Array.isArray(p) ? p[0] : p;
      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        project_id: row.project_id as string,
        date: row.date as string,
        start_time: row.start_time as string,
        end_time: row.end_time as string,
        role: row.role as string | null,
        notes: row.notes as string | null,
        projects: projekt?.title ? { title: projekt.title as string } : null,
      };
    });
    setZuweisungen(normalisiert);
  }, [supabase]);

  useEffect(() => {
    void laden();
  }, [laden]);

  useEffect(() => {
    const kanal = supabase
      .channel("zuweisungen-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        () => {
          void laden();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [supabase, laden]);

  const ressourcen = useMemo(
    () =>
      mitarbeiter.map((m) => ({
        id: m.id,
        title: m.name,
        extendedProps: { abteilungsFarbe: m.abteilungsFarbe },
      })),
    [mitarbeiter]
  );

  const events: EventInput[] = useMemo(() => {
    return zuweisungen.map((z) => {
      const farbe =
        mitarbeiter.find((m) => m.id === z.employee_id)?.abteilungsFarbe ??
        "#3b82f6";
      const titel = z.projects?.title ?? "Einsatz";
      return {
        id: z.id,
        resourceId: z.employee_id,
        title: titel,
        start: datumUndZeitZuIso(z.date, z.start_time),
        end: datumUndZeitZuIso(z.date, z.end_time),
        backgroundColor: farbe,
        borderColor: farbe,
        extendedProps: { zuweisung: z },
      };
    });
  }, [zuweisungen, mitarbeiter]);

  function dialogZuruecksetzen() {
    setBearbeitenId(null);
    setKonfliktText(null);
    setFormMitarbeiterId("");
    setFormProjektId("");
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
    if (projekte[0]?.id) setFormProjektId(projekte[0].id);
    setDialogOffen(true);
  }

  function dialogOeffnenBearbeiten(z: ZuweisungRow) {
    setBearbeitenId(z.id);
    setFormMitarbeiterId(z.employee_id);
    setFormProjektId(z.project_id);
    setFormDatum(z.date);
    setFormStart(z.start_time.slice(0, 5));
    setFormEnde(z.end_time.slice(0, 5));
    setFormRolle(z.role ?? "Teamleiter");
    setFormNotiz(z.notes ?? "");
    setKonfliktText(null);
    setDialogOffen(true);
  }

  async function speichern() {
    if (!formProjektId || !formMitarbeiterId || !formDatum) {
      toast.error("Bitte alle Pflichtfelder ausfüllen.");
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

    if (bearbeitenId) {
      const { error } = await supabase
        .from("assignments")
        .update({
          employee_id: formMitarbeiterId,
          project_id: formProjektId,
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
        project_id: formProjektId,
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
    if (!info.start || !info.end) return;
    dialogOeffnenFuerNeu(res.id, info.start, info.end);
  }

  function onEventClick(info: EventClickArg) {
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
      <div className="rounded-lg border bg-card p-2 md:p-4">
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
                <span className="truncate text-sm font-medium">
                  {arg.resource.title}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      {projekte.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Lege zuerst ein Projekt unter „Projekte“ an, um Einsätze zu buchen.
        </p>
      )}

      <Dialog
        open={dialogOffen}
        onOpenChange={(o) => {
          setDialogOffen(o);
          if (!o) dialogZuruecksetzen();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bearbeitenId ? "Einsatz bearbeiten" : "Neuer Einsatz"}
            </DialogTitle>
          </DialogHeader>

          {konfliktText && (
            <Alert variant="destructive">
              <AlertTitle>Konflikt</AlertTitle>
              <AlertDescription>{konfliktText}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select
                value={formMitarbeiterId}
                onValueChange={(v) => setFormMitarbeiterId(v ?? "")}
              >
                <SelectTrigger>
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
              <Label>Projekt</Label>
              <Select
                value={formProjektId}
                onValueChange={(v) => setFormProjektId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Projekt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {projekte.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="einsatz-datum">Datum</Label>
              <Input
                id="einsatz-datum"
                type="date"
                value={formDatum}
                onChange={(e) => setFormDatum(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="einsatz-start">Start</Label>
                <Input
                  id="einsatz-start"
                  type="time"
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="einsatz-ende">Ende</Label>
                <Input
                  id="einsatz-ende"
                  type="time"
                  value={formEnde}
                  onChange={(e) => setFormEnde(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rolle vor Ort</Label>
              <Select
                value={formRolle}
                onValueChange={(v) => setFormRolle(v ?? "Teamleiter")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teamleiter">Teamleiter</SelectItem>
                  <SelectItem value="Helfer">Helfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="einsatz-notiz">Notiz</Label>
              <Textarea
                id="einsatz-notiz"
                value={formNotiz}
                onChange={(e) => setFormNotiz(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
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
