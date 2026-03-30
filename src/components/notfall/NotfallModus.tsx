"use client";

/**
 * ANALYSE (Notfall-Kontext, laufender Code):
 *
 * 1) Nach `alleErsatzBestaetigen()`:
 *    - DB-Write: `assignments` wird pro `einsatz.id` mit neuem `employee_id` updated.
 *    - Danach: `setAktiverSchritt(4)` -> `NotfallSteuerung` rendert den Success-State.
 *    - Anschließend: `betroffeneLaden({ silent: true })` lädt erneut `einsätze`/Kandidaten,
 *      aber setzt keinen Step zurück (weil `ausfallId`/`datum` sich nicht ändern).
 *    - Kein `router.refresh()` und kein `window.location.reload()` in diesem Flow.
 *
 * 2) Gemini-Antwort Parsing:
 *    - Client-seitig in `parseKiAntwortRoh()` (siehe `src/lib/notfall/parse-ki-antwort.ts`).
 *    - Dort wird `JSON.parse` in einem try/catch benutzt.
 *    - Entfernt wird nur dann ein ```json ... ``` Code-Fence, wenn die gesamte Antwort
 *      exakt auf das Regex-Muster passt; ansonsten wird nicht robust JSON aus Text extrahiert.
 *
 * 3) "Ab wann?" (State `datum`) in DB-Queries:
 *    - `betroffeneLaden()` lädt betroffene Einsätze aktuell mit `.eq("date", datum)` (nur dieser Tag),
 *      nicht mit `.gte("date", abDatum)`.
 *    - Abwesenheiten werden ebenfalls day-specific geholt:
 *      `.lte("start_date", datum)` und `.gte("end_date", datum)`.
 *
 * 4) Globale Konflikt-Suche:
 *    - Es gibt keine separate globale Scanner-Logik im Notfall-Code.
 *    - Konflikte werden pro Kandidat pro Einsatz über `pruefeEinsatzKonflikt()` geprüft
 *      (siehe `src/lib/utils/conflicts.ts`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { parseKiAntwort } from "@/lib/notfall/parse-ki-antwort";
import type { KiErsatzKarte, KiNotfallAntwort } from "@/types/notfall-ki";
import { NotfallSteuerung } from "@/components/notfall/NotfallSteuerung";
import { KiNotfallPanel } from "@/components/notfall/KiNotfallPanel";
import type { NotfallEinsatzZeile, NotfallMitarbeiter } from "@/components/notfall/types";

type KandidatenMap = Record<string, { id: string; name: string }[]>;

function verfuegbareKraeftePayload(
  zeilen: NotfallEinsatzZeile[],
  kandidatenMap: KandidatenMap,
  ausfallEmployeeId: string,
  ausfallDept: string | null | undefined,
  mitarbeiterListe: NotfallMitarbeiter[]
): {
  id: string;
  name: string;
  abteilung: string | null;
  qualifikationen: string[];
  hatKonflikt: boolean;
}[] {
  const basis = mitarbeiterListe.filter(
    (m) =>
      m.id !== ausfallEmployeeId &&
      m.department_id &&
      m.department_id === ausfallDept
  );
  const konfliktAmTag = new Set<string>();
  for (const m of basis) {
    let anyKonflikt = false;
    for (const e of zeilen) {
      const kMap = kandidatenMap[e.id] ?? [];
      if (!kMap.some((k) => k.id === m.id)) {
        anyKonflikt = true;
        break;
      }
    }
    if (anyKonflikt) konfliktAmTag.add(m.id);
  }
  return basis.map((m) => ({
    id: m.id,
    name: m.name,
    abteilung: m.abteilung,
    qualifikationen: m.qualifikationen ?? [],
    hatKonflikt: konfliktAmTag.has(m.id),
  }));
}

export function NotfallModus() {
  const supabase = createClient();
  const [mitarbeiter, setMitarbeiter] = useState<NotfallMitarbeiter[]>([]);
  const [ausfallId, setAusfallId] = useState("");
  const [datum, setDatum] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [einsätze, setEinsätze] = useState<NotfallEinsatzZeile[]>([]);
  const [kandidatenProEinsatz, setKandidatenProEinsatz] = useState<
    Record<string, { id: string; name: string }[]>
  >({});
  const [lädt, setLädt] = useState(false);
  const [betroffeneGeladen, setBetroffeneGeladen] = useState(false);
  const [aktiverSchritt, setAktiverSchritt] = useState(1);

  // Globaler Konflikt-Scanner (Fix 4)
  type ScanErgebnisse = {
    konflikte: {
      employee_id: string;
      mitarbeiterName: string;
      datum: string;
      beschreibung: string;
    }[];
    abwesenheiten: {
      employee_id: string;
      mitarbeiterName: string;
      datum: string;
      beschreibung: string;
    }[];
  };

  const [modus, setModus] = useState<"notfall" | "scanner">("notfall");
  const [scanVon, setScanVon] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [scanBis, setScanBis] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [ladeScanner, setLadeScanner] = useState(false);
  const [scanErgebnisse, setScanErgebnisse] =
    useState<ScanErgebnisse | null>(null);

  const [kiLaed, setKiLaed] = useState(false);
  const [kiStream, setKiStream] = useState("");
  const [kiAntwort, setKiAntwort] = useState<KiNotfallAntwort | null>(null);
  const [kiErsatz, setKiErsatz] = useState<Record<string, KiErsatzKarte>>({});
  const [manuellerErsatz, setManuellerErsatz] = useState<Record<string, string>>(
    {}
  );

  const absenceEingetragenRef = useRef(false);
  // Verhindert „Endlosanalyse“: Nach dem Bestätigen einer Notfall-Auflösung
  // blenden wir die aktuell betroffenen assignment IDs bei erneuter Analyse aus.
  const bereitsAufgelöstAssignmentIdsRef = useRef<Set<string>>(new Set());

  const ausfall = useMemo(
    () => mitarbeiter.find((m) => m.id === ausfallId),
    [mitarbeiter, ausfallId]
  );

  useEffect(() => {
    setBetroffeneGeladen(false);
    setEinsätze([]);
    setKandidatenProEinsatz({});
    setKiAntwort(null);
    setKiStream("");
    setKiErsatz({});
    setManuellerErsatz({});
    setAktiverSchritt(1);
    absenceEingetragenRef.current = false;
  }, [ausfallId, datum]);

  const resetNotfall = useCallback(() => {
    setAusfallId("");
    setDatum(new Date().toISOString().slice(0, 10));
    setEinsätze([]);
    setKandidatenProEinsatz({});
    setBetroffeneGeladen(false);
    setAktiverSchritt(1);
    setKiAntwort(null);
    setKiStream("");
    setKiErsatz({});
    setManuellerErsatz({});
    absenceEingetragenRef.current = false;
    bereitsAufgelöstAssignmentIdsRef.current = new Set();
  }, []);

  const ladenMitarbeiter = useCallback(async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id,name,department_id,qualifikationen,phone,whatsapp")
      .order("name");
    if (error) {
      toast.error(error.message);
      return;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const deptIds = Array.from(
      new Set(
        rows
          .map((r) => r.department_id as string | null | undefined)
          .filter((id): id is string => Boolean(id))
      )
    );

    const deptMap = new Map<string, string>();
    if (deptIds.length > 0) {
      const {
        data: deps,
        error: depErr,
      } = await supabase
        .from("departments")
        .select("id,name")
        .in("id", deptIds);

      if (depErr) {
        toast.error(depErr.message);
      } else {
        for (const d of (deps ?? []) as Record<string, unknown>[]) {
          deptMap.set(String(d.id), String(d.name));
        }
      }
    }

    setMitarbeiter(
      rows.map((row) => {
        const deptId = (row.department_id as string | null | undefined) ?? null;
        return {
          id: row.id as string,
          name: row.name as string,
          department_id: deptId,
          qualifikationen: (row.qualifikationen as string[] | null) ?? null,
          phone: (row.phone as string | null) ?? null,
          whatsapp: (row.whatsapp as string | null) ?? null,
          abteilung: deptId ? deptMap.get(deptId) ?? null : null,
        };
      })
    );
  }, [supabase]);

  useEffect(() => {
    void ladenMitarbeiter();
  }, [ladenMitarbeiter]);

  const betroffeneLaden = useCallback(
    async (opts?: {
      silent?: boolean;
    }): Promise<{ rows: NotfallEinsatzZeile[]; kandidaten: KandidatenMap } | null> => {
      if (!ausfallId || !datum) {
        if (!opts?.silent) toast.error("Mitarbeiter und Datum wählen.");
        return null;
      }
      setLädt(true);
      setKandidatenProEinsatz({});
      try {
        const dept = ausfall?.department_id;

        // Abwesenheiten am Tag (wichtig: Betroffene Einsätze sollen nicht nur vom ausgewählten Mitarbeiter abhängen)
        const { data: abwRows } = await supabase
          .from("absences")
          .select("employee_id")
          .lte("start_date", datum)
          .gte("end_date", datum);

        const abwesendIdsAll = new Set<string>(
          (abwRows ?? []).map((r: Record<string, unknown>) =>
            String(r.employee_id)
          )
        );

        // Nur Abwesenheiten im gleichen Department zählen für “betroffen”
        const absentInDeptIds =
          dept != null
            ? mitarbeiter
                .filter(
                  (m) =>
                    abwesendIdsAll.has(m.id) &&
                    m.department_id != null &&
                    m.department_id === dept
                )
                .map((m) => m.id)
            : Array.from(abwesendIdsAll);

        // Relevante Teams (Teams des ausgewählten Mitarbeiters + Teams der abwesenden Mitarbeiter im Dept)
        const relevantEmpIds = Array.from(
          new Set<string>([ausfallId, ...absentInDeptIds])
        );

        const { data: tmRelevant } = relevantEmpIds.length
          ? await supabase
              .from("team_members")
              .select("employee_id,team_id")
              .in("employee_id", relevantEmpIds)
          : { data: [] as { employee_id: string; team_id: string }[] };

        const relevantTeamIds = Array.from(
          new Set(
            (tmRelevant ?? []).map((r: Record<string, unknown>) =>
              String(r.team_id)
            )
          )
        );

        const sel =
          "id,date,start_time,end_time,project_id,project_title, projects(title, farbe), teams(name)";

        const qAusfall = supabase
          .from("assignments")
          .select(sel)
          .eq("employee_id", ausfallId)
          .gte("date", datum);

        const qAbsentEmployees =
          absentInDeptIds.length > 0
            ? supabase
                .from("assignments")
                .select(sel)
                .in("employee_id", absentInDeptIds)
                .eq("date", datum)
            : null;

        // Team-Slots gelten als “betroffen”, aber nur wenn noch kein employee_id gesetzt ist
        // (sonst bekommst du Einsätze, die schon einem anderen (anwesenden) Vertreter zugewiesen sind)
        const qTeamUnassigned =
          relevantTeamIds.length > 0
            ? supabase
                .from("assignments")
                .select(sel)
                .in("team_id", relevantTeamIds)
                .is("employee_id", null)
                .eq("date", datum)
            : null;

        const emptyRes: { data: Record<string, unknown>[]; error: null } = {
          data: [],
          error: null,
        };
        const [qAusfallRes, qAbsentRes, qTeamRes] = await Promise.all([
          qAusfall,
          qAbsentEmployees ? qAbsentEmployees : Promise.resolve(emptyRes),
          qTeamUnassigned ? qTeamUnassigned : Promise.resolve(emptyRes),
        ]);

        if (qAusfallRes.error) throw qAusfallRes.error;
        if (qAbsentRes?.error) throw qAbsentRes.error;
        if (qTeamRes?.error) throw qTeamRes.error;

        const combined = [
          ...(qAusfallRes.data ?? []),
          ...((qAbsentRes?.data ?? []) as Record<string, unknown>[]),
          ...((qTeamRes?.data ?? []) as Record<string, unknown>[]),
        ] as Record<string, unknown>[];

        const rows: NotfallEinsatzZeile[] = Array.from(
          new Map(combined.map((r) => [String(r.id), r] as const)).values()
        ).map((row: Record<string, unknown>) => {
          const p = row.projects;
          const proj = Array.isArray(p) ? p[0] : p;
          const projObj = proj as
            | { title?: string; farbe?: string | null }
            | null
            | undefined;
          const t = row.teams as
            | { name?: string }
            | { name?: string }[]
            | null;
          const team = Array.isArray(t) ? t[0] : t;
          return {
            id: row.id as string,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            project_id: (row.project_id as string | null) ?? null,
            project_title: (row.project_title as string | null) ?? null,
            projects: projObj?.title
              ? { title: projObj.title, farbe: projObj.farbe ?? null }
              : null,
            teamName: team?.name ? String(team.name) : null,
          };
        });

        const bereitsAufgelöst = bereitsAufgelöstAssignmentIdsRef.current;
        const finalRows =
          bereitsAufgelöst.size > 0
            ? rows.filter((r) => !bereitsAufgelöst.has(r.id))
            : rows;

        setEinsätze(finalRows);
        setBetroffeneGeladen(true);

        // Kandidaten nur, wenn sie am Tag nicht abwesend sind
        const abwesendIds = abwesendIdsAll;

        const kandidatenBasis = mitarbeiter.filter(
          (m) =>
            m.id !== ausfallId && m.department_id && m.department_id === dept
            && !abwesendIds.has(m.id)
        );

        // Team-IDs je Kandidat, damit Team-Einsätze auch als Konflikt zählen
        const kandIds = kandidatenBasis.map((k) => k.id);
        const teamIdsByEmployee: Record<string, string[]> = {};
        if (kandIds.length > 0) {
          const { data: tmRows } = await supabase
            .from("team_members")
            .select("employee_id,team_id")
            .in("employee_id", kandIds);
          const map: Record<string, Set<string>> = {};
          for (const r of tmRows ?? []) {
            const emp = String((r as Record<string, unknown>).employee_id);
            const tid = String((r as Record<string, unknown>).team_id);
            if (!map[emp]) map[emp] = new Set<string>();
            map[emp].add(tid);
          }
          for (const [emp, set] of Object.entries(map)) {
            teamIdsByEmployee[emp] = Array.from(set);
          }
        }

        const map: KandidatenMap = {};
        for (const e of finalRows) {
          const ok: { id: string; name: string }[] = [];
          for (const k of kandidatenBasis) {
            const pr = await pruefeEinsatzKonflikt(supabase, {
              mitarbeiterId: k.id,
              datum,
              startZeit: e.start_time,
              endZeit: e.end_time,
              teamIds: teamIdsByEmployee[k.id] ?? [],
            });
            if (!pr.hatKonflikt) {
              ok.push({ id: k.id, name: k.name });
            }
          }
          map[e.id] = ok;
        }
        setKandidatenProEinsatz(map);

        if (rows.length === 0 && !opts?.silent) {
          toast.info("Keine Einsätze an diesem Tag für diesen Mitarbeiter.");
        }
        return { rows: finalRows, kandidaten: map };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Laden fehlgeschlagen.";
        toast.error(msg);
        return null;
      } finally {
        setLädt(false);
      }
    },
    [ausfallId, ausfall?.department_id, datum, mitarbeiter, supabase]
  );

  const abwesenheitenFuerDatum = useCallback(async (): Promise<
    { employeeId: string; startDate: string; endDate: string; type: string }[]
  > => {
    const { data, error } = await supabase
      .from("absences")
      .select("employee_id,start_date,end_date,type")
      .lte("start_date", datum)
      .gte("end_date", datum);
    if (error || !data) return [];
    return (
      data as {
        employee_id: string;
        start_date: string;
        end_date: string;
        type: string;
      }[]
    ).map((r) => ({
      employeeId: r.employee_id,
      startDate: r.start_date,
      endDate: r.end_date,
      type: r.type,
    }));
  }, [datum, supabase]);

  const notfallAusloesen = useCallback(async () => {
    if (!ausfallId || !datum) {
      toast.error("Mitarbeiter und Datum wählen.");
      return;
    }
    absenceEingetragenRef.current = false;
    setKiLaed(true);
    setKiStream("");
    setKiAntwort(null);
    setKiErsatz({});
    setManuellerErsatz({});

    const geladen = await betroffeneLaden({ silent: true });
    if (!geladen) {
      setKiLaed(false);
      return;
    }
    const { rows, kandidaten } = geladen;

    const abw = await abwesenheitenFuerDatum();
    const ausfallMitarbeiter = ausfall;
    const ausfallHatAbwesenheit = abw.some(
      (a) => a.employeeId === ausfallId
    );
    const ausfallAbwesenheitTyp =
      abw.find((a) => a.employeeId === ausfallId)?.type ?? null;
    const payload = {
      ausfallMitarbeiter: {
        id: ausfallMitarbeiter?.id ?? ausfallId,
        name: ausfallMitarbeiter?.name ?? "",
        abteilung: ausfallMitarbeiter?.abteilung ?? "",
        qualifikationen: ausfallMitarbeiter?.qualifikationen ?? [],
      },
      ausfallHatAbwesenheit,
      ausfallAbwesenheitTyp,
      datum,
      betroffeneEinsaetze: rows.map((e) => ({
        id: e.id,
        projektTitel:
          e.projects?.title ?? e.project_title?.trim() ?? "Einsatz",
        teamName: e.teamName,
        datum: e.date,
        startZeit: e.start_time,
        endZeit: e.end_time,
      })),
      verfuegbareKraefte: verfuegbareKraeftePayload(
        rows,
        kandidaten,
        ausfallId,
        ausfall?.department_id,
        mitarbeiter
      ),
      abwesenheiten: abw,
    };

    try {
      const res = await fetch("/api/agents/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { fehler?: string };
        toast.error(j.fehler ?? "KI-Anfrage fehlgeschlagen.");
        setKiLaed(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setKiLaed(false);
        return;
      }

      const decoder = new TextDecoder();
      let volltext = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        volltext += decoder.decode(value, { stream: true });
        setKiStream(volltext);
      }

      const parsed = parseKiAntwort(volltext);
      setKiAntwort(parsed);

      const map: Record<string, KiErsatzKarte> = {};
      for (const einsatz of parsed.einsaetze ?? []) {
        const first = einsatz.vorschlaege?.[0];
        if (!first?.mitarbeiter_id) continue;
        map[einsatz.id] = {
          name: first.name,
          employeeId: first.mitarbeiter_id,
          grund: first.grund,
        };
      }
      setKiErsatz(map);

      const { error: logErr } = await supabase.from("emergency_log").insert({
        affected_assignments: rows.map((r) => r.id),
        agent_suggestion: parsed as unknown as Record<string, unknown>,
      });
      if (logErr) {
        console.warn("[Notfall] emergency_log:", logErr.message);
      }

      if (rows.length > 0) {
        setAktiverSchritt(2);
      } else {
        setAktiverSchritt(1);
      }

      if (rows.length === 0) {
        toast.info("Keine Einsätze — KI hat dennoch eine Einschätzung geliefert.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Netzwerkfehler.";
      toast.error(msg);
    } finally {
      setKiLaed(false);
    }
  }, [
    ausfallId,
    datum,
    betroffeneLaden,
    ausfall,
    supabase,
    mitarbeiter,
    abwesenheitenFuerDatum,
  ]);

  function ersatzManuellSetzen(einsatzId: string, employeeId: string | null) {
    setManuellerErsatz((prev) => {
      const n = { ...prev };
      if (employeeId == null) delete n[einsatzId];
      else n[einsatzId] = employeeId;
      return n;
    });
  }

  async function absenceEinmalig() {
    if (absenceEingetragenRef.current) return;
    const { error } = await supabase.from("absences").insert({
      employee_id: ausfallId,
      type: "krank",
      start_date: datum,
      end_date: datum,
      status: "genehmigt",
      notes: "Notfall-Ausfall (Planung)",
      is_emergency: true,
      quelle: "manuell",
    });
    if (!error) absenceEingetragenRef.current = true;
  }

  async function alleErsatzBestaetigen() {
    const jobs: Promise<void>[] = [];
    for (const e of einsätze) {
      const ki = kiErsatz[e.id];
      const manual = manuellerErsatz[e.id];
      const ersatzIdEmp = manual ?? ki?.employeeId;
      if (!ersatzIdEmp) continue;
      jobs.push(
        (async () => {
          const { error } = await supabase
            .from("assignments")
            .update({ employee_id: ersatzIdEmp })
            .eq("id", e.id);
          if (error) throw error;
        })()
      );
    }
    if (jobs.length === 0) {
      toast.info("Keine vollständige Ersatzwahl — bitte alle Einsätze zuweisen.");
      return;
    }
    if (jobs.length < einsätze.length) {
      toast.error("Bitte für jeden Einsatz einen Ersatz wählen.");
      return;
    }
    setLädt(true);
    try {
      await Promise.all(jobs);
      await absenceEinmalig();
      toast.success(`Alle ${jobs.length} Ersatzplanungen übernommen.`);
      setAktiverSchritt(4);
      bereitsAufgelöstAssignmentIdsRef.current = new Set(
        einsätze.map((e) => e.id)
      );
      void betroffeneLaden({ silent: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Batch fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  async function globalScanStarten() {
    setLadeScanner(true);
    setScanErgebnisse(null);

    try {
      const { data: assignments, error: aErr } = await supabase
        .from("assignments")
        .select(
          "id,date,start_time,end_time,employee_id,project_title,projects(title)"
        )
        .gte("date", scanVon)
        .lte("date", scanBis);

      if (aErr) throw aErr;

      const rows = (assignments ?? []) as Record<string, unknown>[];

      const { data: absences, error: abErr } = await supabase
        .from("absences")
        .select("employee_id,start_date,end_date,type")
        .lte("start_date", scanBis)
        .gte("end_date", scanVon);

      if (abErr) throw abErr;

      const absenceRows = (absences ?? []) as Record<string, unknown>[];

      const zeitZuMinuten = (t: string) => {
        const parts = t.split(":").map((x) => parseInt(x, 10));
        const h = Number.isFinite(parts[0]) ? parts[0]! : 0;
        const m = Number.isFinite(parts[1]) ? parts[1]! : 0;
        const s = Number.isFinite(parts[2]) ? parts[2]! : 0;
        return h * 60 + m + s / 60;
      };

      // 1) Konflikte: gleicher MA, gleiche Tagesdate, überlappende Zeitfenster
      const byKey = new Map<string, Record<string, unknown>[]>();
      for (const r of rows) {
        const empId = r.employee_id == null ? null : String(r.employee_id);
        if (!empId) continue;
        const date = String(r.date);
        const k = `${empId}_${date}`;
        const arr = byKey.get(k) ?? [];
        arr.push(r);
        byKey.set(k, arr);
      }

      const konflikte: ScanErgebnisse["konflikte"] = [];
      const byKeyEntries = Array.from(byKey.entries());
      for (const [k, list] of byKeyEntries) {
        if (list.length < 2) continue;
        let hasOverlap = false;
        for (let i = 0; i < list.length && !hasOverlap; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            const aStart = zeitZuMinuten(String(a.start_time ?? "00:00:00"));
            const aEnd = zeitZuMinuten(String(a.end_time ?? "00:00:00"));
            const bStart = zeitZuMinuten(String(b.start_time ?? "00:00:00"));
            const bEnd = zeitZuMinuten(String(b.end_time ?? "00:00:00"));
            if (aStart < bEnd && aEnd > bStart) {
              hasOverlap = true;
              break;
            }
          }
        }
        if (!hasOverlap) continue;

        const [employee_id, datum] = k.split("_");
        const name =
          mitarbeiter.find((m) => m.id === employee_id)?.name ??
          employee_id;

        const times = list
          .map(
            (x) => `${String(x.start_time)}–${String(x.end_time)}`
          )
          .join(", ");

        konflikte.push({
          employee_id,
          mitarbeiterName: name,
          datum,
          beschreibung: `Überschneidungen: ${times}`,
        });
      }

      // 2) Abwesenheits-Konflikte: Abwesenheit im Zeitraum UND Einsatz an einem Tag dazwischen
      const abwesenheiten: ScanErgebnisse["abwesenheiten"] = [];
      for (const abw of absenceRows) {
        const empId = abw.employee_id == null ? null : String(abw.employee_id);
        if (!empId) continue;
        const startDate = String(abw.start_date);
        const endDate = String(abw.end_date);
        const typRaw = String(abw.type ?? "");

        const label =
          typRaw === "krank"
            ? "Krank"
            : typRaw === "urlaub"
              ? "Urlaub"
              : typRaw === "fortbildung"
                ? "Fortbildung"
                : typRaw || "Abwesenheit";

        const betroffene = rows.filter((r) => {
          const rEmp = r.employee_id == null ? null : String(r.employee_id);
          if (!rEmp || rEmp !== empId) return false;
          const d = String(r.date);
          return d >= startDate && d <= endDate;
        });

        const uniqueDates = Array.from(
          new Set(betroffene.map((x) => String(x.date)))
        );

        for (const d of uniqueDates) {
          if (!d) continue;
          const name =
            mitarbeiter.find((m) => m.id === empId)?.name ?? empId;
          abwesenheiten.push({
            employee_id: empId,
            mitarbeiterName: name,
            datum: d,
            beschreibung: `Einsatz während ${label} (${startDate}–${endDate})`,
          });
        }
      }

      setScanErgebnisse({ konflikte, abwesenheiten });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scanner fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLadeScanner(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-60px)] min-h-0 gap-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
        <div className="mb-2 rounded-2xl border border-zinc-800/60 bg-zinc-900 p-2">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setModus("notfall")}
              className={cn(
                "flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all",
                modus === "notfall"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <AlertTriangle size={15} />
              Notfallplan
            </button>
            <button
              type="button"
              onClick={() => setModus("scanner")}
              className={cn(
                "flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all",
                modus === "scanner"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <CalendarX size={15} />
              Konflikt-Scanner
            </button>
          </div>
        </div>

        {modus === "scanner" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
              <h3 className="mb-4 text-sm font-semibold text-zinc-200">
                Zeitraum scannen
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Von
                  </label>
                  <input
                    type="date"
                    value={scanVon}
                    onChange={(e) => setScanVon(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 [color-scheme:dark] focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Bis
                  </label>
                  <input
                    type="date"
                    value={scanBis}
                    onChange={(e) => setScanBis(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 [color-scheme:dark] focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void globalScanStarten()}
                disabled={ladeScanner}
                className={cn(
                  "w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                  !ladeScanner
                    ? "bg-zinc-100 text-zinc-900 hover:bg-white"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                {ladeScanner ? "Scanne..." : "Vollständigen Scan starten"}
              </button>
            </div>

            {scanErgebnisse ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums text-rose-400">
                      {scanErgebnisse.konflikte.length}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Konflikte
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums text-amber-400">
                      {scanErgebnisse.abwesenheiten.length}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Abwesenheiten
                    </p>
                  </div>
                </div>

                {[...scanErgebnisse.konflikte, ...scanErgebnisse.abwesenheiten]
                  .slice(0, 20)
                  .map((p, idx) => (
                    <div
                      key={`${p.employee_id}-${p.datum}-${idx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setModus("notfall");
                        setKiLaed(false);
                        setKiStream("");
                        setKiAntwort(null);
                        setKiErsatz({});
                        setManuellerErsatz({});
                        setAusfallId(p.employee_id);
                        setDatum(p.datum);
                      }}
                      className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-3.5 hover:border-zinc-700 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-2.5 h-2.5 mt-1 rounded-full bg-red-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-200">
                            {p.mitarbeiterName}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {p.datum} · {p.beschreibung}
                          </p>
                        </div>
                        <div className="text-xs text-zinc-600 flex-shrink-0">
                          Lösen →
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        ) : (
          <NotfallSteuerung
            mitarbeiter={mitarbeiter}
            ausfallId={ausfallId}
            setAusfallId={setAusfallId}
            datum={datum}
            setDatum={setDatum}
            aktiverSchritt={aktiverSchritt}
            setAktiverSchritt={setAktiverSchritt}
            betroffeneGeladen={betroffeneGeladen}
            kiLaed={kiLaed}
            onNotfallAnalysieren={() => void notfallAusloesen()}
            einsätze={einsätze}
            kandidatenProEinsatz={kandidatenProEinsatz}
            kiErsatz={kiErsatz}
            manuellerErsatz={manuellerErsatz}
            ersatzManuellSetzen={ersatzManuellSetzen}
            onAlleErsatzBestaetigen={() => void alleErsatzBestaetigen()}
            onResetNotfall={resetNotfall}
            lädt={lädt}
          />
        )}
      </div>
      <div className="flex w-[420px] shrink-0 min-h-0 flex-col">
        <KiNotfallPanel
          kiLaed={kiLaed}
          kiStream={kiStream}
          kiAntwort={kiAntwort}
          onNeuAnalysieren={() => void notfallAusloesen()}
          ausgewaehlterErsatz={manuellerErsatz}
          onErsatzWaehlen={(einsatzId, mitarbeiterId) =>
            ersatzManuellSetzen(einsatzId, mitarbeiterId)
          }
        />
      </div>
    </div>
  );
}
