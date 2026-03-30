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
import { ScanSearch } from "lucide-react";
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
      typ: "konflikt";
    }[];
    abwesenheiten: {
      employee_id: string;
      mitarbeiterName: string;
      datum: string;
      beschreibung: string;
      typ: "abwesenheit";
      abwesenheitTypLabel: string;
    }[];
  };

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
                .gte("date", datum)
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
                .gte("date", datum)
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
      .select("employee_id,start_date,end_date,type,absence_type")
      .lte("start_date", datum)
      .gte("end_date", datum);
    if (error || !data) return [];
    return (
      data as {
        employee_id: string;
        start_date: string;
        end_date: string;
        type?: string | null;
        absence_type?: string | null;
      }[]
    ).map((r) => ({
      employeeId: r.employee_id,
      startDate: r.start_date,
      endDate: r.end_date,
      type: (r.absence_type ?? r.type ?? "").toString(),
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
          score: first.score ?? 0,
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
    if (einsätze.length === 0) return;
    setLädt(true);

    try {
      // Für jeden Einsatz muss ein Ersatz existieren.
      const ersatzMap: Record<string, string> = {};
      for (const e of einsätze) {
        const ki = kiErsatz[e.id];
        const manual = manuellerErsatz[e.id];
        const ersatzIdEmp = manual ?? ki?.employeeId;
        if (ersatzIdEmp) ersatzMap[e.id] = ersatzIdEmp;
      }

      const ersatzIds = Object.keys(ersatzMap);
      if (ersatzIds.length === 0) {
        toast.info(
          "Keine vollständige Ersatzwahl — bitte alle Einsätze zuweisen."
        );
        return;
      }
      if (ersatzIds.length < einsätze.length) {
        toast.error("Bitte für jeden Einsatz einen Ersatz wählen.");
        return;
      }

      const fehlgeschlagen: { einsatzId: string; message: string }[] = [];

      // Pro Einsatz einzeln updaten, damit Fehler pro Row sichtbar bleiben.
      for (const e of einsätze) {
        const ersatzIdEmp = ersatzMap[e.id];
        try {
          const { error } = await supabase
            .from("assignments")
            .update({ employee_id: ersatzIdEmp })
            .eq("id", e.id);

          if (error) {
            console.error(
              `[alleErsatzBestaetigen] Update fehlgeschlagen für ${e.id}:`,
              error
            );
            fehlgeschlagen.push({ einsatzId: e.id, message: error.message });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[alleErsatzBestaetigen] Unerwarteter Fehler für ${e.id}:`,
            err
          );
          fehlgeschlagen.push({ einsatzId: e.id, message: msg });
        }
      }

      if (fehlgeschlagen.length > 0) {
        console.error(
          "[alleErsatzBestaetigen] Fehlgeschlagen:",
          fehlgeschlagen
        );
        const first = fehlgeschlagen[0];
        toast.error(
          `Fehler bei ${fehlgeschlagen.length} Einsatz/Einsätzen: ${first?.message ?? "Supabase Console prüfen."}`
        );
        return;
      }

      await absenceEinmalig();

      toast.success(`Alle ${einsätze.length} Ersatzplanungen übernommen.`);
      setAktiverSchritt(4);
      bereitsAufgelöstAssignmentIdsRef.current = new Set(
        einsätze.map((e) => e.id)
      );
      void betroffeneLaden({ silent: true });

      // Fix 7: Planung aktualisieren
      window.dispatchEvent(new CustomEvent("planung:refresh"));
    } finally {
      setLädt(false);
    }
  }

  async function globalScanStarten() {
    setLadeScanner(true);
    setScanErgebnisse(null);

    try {
      // Primär mit Status-Filter, Fallback ohne Status-Filter (für ältere DB-Stände).
      const q1 = await supabase
        .from("assignments")
        .select(
          "id,date,start_time,end_time,employee_id,team_id,project_title,projects(title)"
        )
        .gte("date", scanVon)
        .lte("date", scanBis)
        .in("status", ["neu", "geplant", "aktiv"]);

      let assignments: Record<string, unknown>[] = [];
      if (q1.error) {
        const q2 = await supabase
          .from("assignments")
          .select(
            "id,date,start_time,end_time,employee_id,team_id,project_title,projects(title)"
          )
          .gte("date", scanVon)
          .lte("date", scanBis);
        if (q2.error) throw q2.error;
        assignments = (q2.data ?? []) as Record<string, unknown>[];
      } else {
        assignments = (q1.data ?? []) as Record<string, unknown>[];
      }

      const rows = assignments;
      const assignmentIds = rows.map((r) => String(r.id));

      // Viele DB-Stände nutzen assignment_employees als Hauptzuweisung.
      const assignmentEmployeesByAssignment = new Map<string, string[]>();
      if (assignmentIds.length > 0) {
        const { data: aeRows, error: aeErr } = await supabase
          .from("assignment_employees")
          .select("assignment_id,employee_id")
          .in("assignment_id", assignmentIds);
        if (aeErr) throw aeErr;
        const tmp: Record<string, Set<string>> = {};
        for (const r of (aeRows ?? []) as { assignment_id: string; employee_id: string }[]) {
          const aid = String(r.assignment_id);
          const eid = String(r.employee_id);
          tmp[aid] ??= new Set<string>();
          tmp[aid].add(eid);
        }
        for (const [aid, set] of Object.entries(tmp)) {
          assignmentEmployeesByAssignment.set(aid, Array.from(set));
        }
      }

      const teamIds = Array.from(
        new Set(
          rows
            .map((r) => (r.team_id == null ? null : String(r.team_id)))
            .filter((x): x is string => Boolean(x))
        )
      );

      const teamMembersByTeam = new Map<string, string[]>();
      if (teamIds.length > 0) {
        const { data: tmRows, error: tmErr } = await supabase
          .from("team_members")
          .select("team_id,employee_id")
          .in("team_id", teamIds);
        if (tmErr) throw tmErr;
        const acc: Record<string, Set<string>> = {};
        type TeamMemberRow = { team_id: string; employee_id: string };
        for (const r of (tmRows ?? []) as TeamMemberRow[]) {
          const tid = String(r.team_id);
          const eid = String(r.employee_id);
          acc[tid] ??= new Set<string>();
          acc[tid].add(eid);
        }
        for (const [tid, set] of Object.entries(acc)) {
          teamMembersByTeam.set(tid, Array.from(set));
        }
      }

      // Manche DB-Stände haben `type`, andere `absence_type`.
      let absenceRows: Record<string, unknown>[] = [];
      const ab1 = await supabase
        .from("absences")
        .select("employee_id,start_date,end_date,absence_type")
        .lte("start_date", scanBis)
        .gte("end_date", scanVon);
      if (ab1.error) {
        const ab2 = await supabase
          .from("absences")
          .select("employee_id,start_date,end_date,type")
          .lte("start_date", scanBis)
          .gte("end_date", scanVon);
        if (ab2.error) throw ab2.error;
        absenceRows = (ab2.data ?? []) as Record<string, unknown>[];
      } else {
        absenceRows = (ab1.data ?? []) as Record<string, unknown>[];
      }

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
        const date = String(r.date);
        const assignmentId = String(r.id);
        const empId = r.employee_id == null ? null : String(r.employee_id);
        const teamId = r.team_id == null ? null : String(r.team_id);
        const empFromPivot = assignmentEmployeesByAssignment.get(assignmentId) ?? [];

        // Mitarbeiter aus assignments.employee_id + assignment_employees sammeln
        const alleEmpIds = Array.from(new Set<string>([
          ...(empId ? [empId] : []),
          ...empFromPivot,
        ]));
        for (const eid of alleEmpIds) {
          const k = `${eid}_${date}`;
          const arr = byKey.get(k) ?? [];
          arr.push(r);
          byKey.set(k, arr);
        }

        // Team-Slots ohne konkrete Person: potentieller Konflikt für alle Team-Mitglieder
        if (alleEmpIds.length === 0 && teamId) {
          const members = teamMembersByTeam.get(teamId) ?? [];
          for (const mid of members) {
            const k = `${mid}_${date}`;
            const arr = byKey.get(k) ?? [];
            arr.push({ ...r, __teamSlot: true, __teamMemberId: mid });
            byKey.set(k, arr);
          }
        }
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
          typ: "konflikt",
        });
      }

      // 2) Abwesenheits-Konflikte: Abwesenheit im Zeitraum UND Einsatz an einem Tag dazwischen
      const abwesenheiten: ScanErgebnisse["abwesenheiten"] = [];
      for (const abw of absenceRows) {
        const empId = abw.employee_id == null ? null : String(abw.employee_id);
        if (!empId) continue;
        const startDate = String(abw.start_date);
        const endDate = String(abw.end_date);
        const typRaw = String(
          (abw as Record<string, unknown>).absence_type ??
            (abw as Record<string, unknown>).type ??
            ""
        ).toLowerCase();

        const label = typRaw.includes("krank")
          ? "Krank"
          : typRaw.includes("urlaub")
            ? "Urlaub"
            : typRaw.includes("fortbildung")
              ? "Fortbildung"
              : typRaw || "Abwesenheit";

        // Betroffene Einsätze: direkte Zuweisung + assignment_employees + Team-Slot
        const betroffene = rows.filter((r) => {
          const d = String(r.date);
          if (!(d >= startDate && d <= endDate)) return false;

          const assignmentId = String(r.id);
          const rEmp = r.employee_id == null ? null : String(r.employee_id);
          if (rEmp && rEmp === empId) return true;

          const pivotEmp = assignmentEmployeesByAssignment.get(assignmentId) ?? [];
          if (pivotEmp.includes(empId)) return true;

          const teamId = r.team_id == null ? null : String(r.team_id);
          if (!teamId) return false;
          const members = teamMembersByTeam.get(teamId) ?? [];
          return members.includes(empId);
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
            typ: "abwesenheit",
            abwesenheitTypLabel: label,
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
    <div className="flex min-h-[calc(100vh-60px)] flex-col gap-3">
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950 p-4">
        <div id="notfall-stepper">
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
            scannerElement={
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanSearch size={14} className="text-zinc-500" />
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Konflikt-Scanner
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={scanVon}
                    onChange={(e) => setScanVon(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 [color-scheme:dark] focus:outline-none focus:border-zinc-600"
                  />
                  <span className="text-zinc-700 text-xs">bis</span>
                  <input
                    type="date"
                    value={scanBis}
                    onChange={(e) => setScanBis(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 [color-scheme:dark] focus:outline-none focus:border-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => void globalScanStarten()}
                    disabled={ladeScanner}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-colors flex items-center gap-1.5",
                      !ladeScanner
                        ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        : "bg-zinc-800 text-zinc-600 opacity-60 cursor-not-allowed"
                    )}
                  >
                    {ladeScanner ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-zinc-600/30 border-t-zinc-600 animate-spin" />
                        Scanne
                      </>
                    ) : (
                      <>
                        <ScanSearch size={13} />
                        Scannen
                      </>
                    )}
                  </button>
                </div>
                {scanErgebnisse ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...scanErgebnisse.konflikte, ...scanErgebnisse.abwesenheiten]
                      .slice(0, 30)
                      .map((p, idx) => (
                        <button
                          key={`${p.employee_id}-${p.datum}-${idx}`}
                          type="button"
                          onClick={() => {
                            setKiLaed(false);
                            setKiStream("");
                            setKiAntwort(null);
                            setKiErsatz({});
                            setManuellerErsatz({});
                            setAusfallId(p.employee_id);
                            setDatum(p.datum);
                            document
                              .getElementById("notfall-stepper")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all text-xs font-medium text-zinc-300"
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              p.typ === "konflikt"
                                ? "bg-amber-500"
                                : p.abwesenheitTypLabel === "Krank"
                                  ? "bg-red-400"
                                  : "bg-amber-500"
                            )}
                          />
                          <span className="max-w-[120px] truncate">{p.mitarbeiterName}</span>
                          <span className="text-zinc-600 tabular-nums">
                            {(() => {
                              try {
                                return new Date(p.datum + "T00:00:00").toLocaleDateString(
                                  "de-DE",
                                  { day: "2-digit", month: "2-digit" }
                                );
                              } catch {
                                return p.datum;
                              }
                            })()}
                          </span>
                          {p.typ === "abwesenheit" ? (
                            <span
                              className={cn(
                                "text-[10px] font-semibold",
                                p.abwesenheitTypLabel === "Krank"
                                  ? "text-red-400"
                                  : p.abwesenheitTypLabel === "Urlaub"
                                    ? "text-amber-400"
                                    : "text-zinc-400"
                              )}
                            >
                              {p.abwesenheitTypLabel}
                            </span>
                          ) : null}
                        </button>
                      ))}
                  </div>
                ) : null}
              </div>
            }
          />
        </div>
      </div>

      <div className="flex-1 min-h-[360px] rounded-2xl border border-zinc-800/60 bg-zinc-950">
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
