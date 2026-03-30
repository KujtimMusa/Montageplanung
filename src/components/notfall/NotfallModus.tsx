"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { parseKiAntwortRoh } from "@/lib/notfall/parse-ki-antwort";
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

  const [abwesenheitenHeute, setAbwesenheitenHeute] = useState<
    { employeeId: string; startDate: string; endDate: string; type: string }[]
  >([]);

  const kommunikationWhatsapp = useMemo(() => {
    const firstEinsatz = einsätze[0];
    if (!firstEinsatz) return null;

    const repId =
      manuellerErsatz[firstEinsatz.id] ?? kiErsatz[firstEinsatz.id]?.employeeId;
    if (!repId) return null;

    return mitarbeiter.find((m) => m.id === repId)?.whatsapp ?? null;
  }, [einsätze, manuellerErsatz, kiErsatz, mitarbeiter]);

  useEffect(() => {
    setBetroffeneGeladen(false);
    setEinsätze([]);
    setKandidatenProEinsatz({});
    setKiAntwort(null);
    setKiStream("");
    setKiErsatz({});
    setManuellerErsatz({});
    setAbwesenheitenHeute([]);
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
    setAbwesenheitenHeute([]);
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
          .eq("date", datum);

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
    setAbwesenheitenHeute(abw);
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

      const parsed = parseKiAntwortRoh(volltext);
      setKiAntwort(parsed);

      const map: Record<string, KiErsatzKarte> = {};
      for (const emp of parsed.empfehlungen) {
        if (emp.einsatzId && emp.employeeId) {
          const grund =
            emp.begruendung.length > 40
              ? `${emp.begruendung.slice(0, 37)}…`
              : emp.begruendung;
          map[emp.einsatzId] = {
            name: emp.name,
            employeeId: emp.employeeId,
            grund,
          };
        }
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

  const employeeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const emp of mitarbeiter) m.set(emp.id, emp.name);
    return m;
  }, [mitarbeiter]);

  const formatDate = useCallback((isoDate: string) => {
    const [y, m, d] = isoDate.split("-");
    return `${d}.${m}.${y}`;
  }, []);

  const typeLabel = useCallback((t: string) => {
    if (t === "urlaub") return "Urlaub";
    if (t === "krank") return "Krank";
    if (t === "fortbildung") return "Fortbildung";
    return t;
  }, []);

  const risikenFakten = useMemo(() => {
    const risks: string[] = [];

    if (abwesenheitenHeute.length > 0) {
      const first = abwesenheitenHeute.slice(0, 2);
      for (const a of first) {
        const name = employeeNameById.get(a.employeeId) ?? a.employeeId;
        risks.push(
          `${name} ist vom ${formatDate(a.startDate)} bis ${formatDate(
            a.endDate
          )} abwesend (${typeLabel(a.type)}).`
        );
      }
    }

    if (einsätze.length > 0) {
      risks.push(
        `Ersatzbedarf: ${einsätze.length} betroffene Einsatz(e) am ${datum}.`
      );
    }

    const ohneKonfliktfreienErsatz = einsätze.find(
      (e) => (kandidatenProEinsatz[e.id] ?? []).length === 0
    );
    if (ohneKonfliktfreienErsatz) {
      risks.push(
        `Für "${ohneKonfliktfreienErsatz.project_title ?? "Einsatz"}" sind keine konfliktfreien Ersatzkräfte verfügbar.`
      );
    }

    return risks;
  }, [
    abwesenheitenHeute,
    employeeNameById,
    formatDate,
    typeLabel,
    einsätze,
    kandidatenProEinsatz,
    datum,
  ]);

  const zusammenfassungFakten = useMemo(() => {
    const n = einsätze.length;
    const abwCount = abwesenheitenHeute.length;

    const beispiellines = einsätze.slice(0, 3).map((e) => {
      const proj = e.project_title ?? "Einsatz";
      const team = e.teamName ? ` (${e.teamName})` : "";
      return `- ${proj}${team} ${e.start_time}-${e.end_time}`;
    });

    const beispielRest = n > 3 ? `\n- + ${n - 3} weitere Einsätze` : "";

    const abwesenText =
      abwCount > 0
        ? abwesenheitenHeute
            .slice(0, 2)
            .map((a) => {
              const name = employeeNameById.get(a.employeeId) ?? a.employeeId;
              return `${name} (${typeLabel(a.type)})`;
            })
            .join(", ")
        : "Keine Abwesenheiten am Tag hinterlegt.";

    return `### Betroffene Einsätze\n${
      n > 0 ? `Es sind ${n} Einsatz(e) betroffen am ${datum}.` : `Keine Einsätze gefunden am ${datum}.`
    }\n${beispiellines.join("\n")}${beispielRest}\n\n### Abwesenheiten\n${abwesenText}\n\n### Vorgehen\nFür jeden betroffenen Einsatz eine konfliktfreie Ersatzkraft zuweisen und anschließend bestätigen.`;
  }, [
    einsätze,
    abwesenheitenHeute,
    datum,
    employeeNameById,
    typeLabel,
  ]);

  const kommunikationFakten = useMemo(() => {
    if (einsätze.length === 0) return "";

    const maxLines = 10;
    const lines = einsätze.slice(0, maxLines).map((e) => {
      const proj = e.project_title ?? "Einsatz";
      const team = e.teamName ? ` (${e.teamName})` : "";

      const repId = manuellerErsatz[e.id] ?? kiErsatz[e.id]?.employeeId;
      const repName =
        repId != null
          ? employeeNameById.get(repId) ?? kiErsatz[e.id]?.name ?? repId
          : kiErsatz[e.id]?.name ?? null;

      return `- ${proj}${team} ${e.start_time}-${e.end_time}: ${
        repName ? repName : "noch offen"
      }`;
    });

    const rest = einsätze.length > maxLines ? `\n- + ${einsätze.length - maxLines} weitere Einsätze` : "";

    return `Bitte ab ${datum} folgende Einsätze übernehmen (Ersatzplan):\n${lines.join(
      "\n"
    )}${rest}`;
  }, [
    einsätze,
    datum,
    manuellerErsatz,
    kiErsatz,
    employeeNameById,
  ]);

  return (
    <div className="flex h-[calc(100vh-60px)] min-h-0 gap-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
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
      </div>
      <div className="flex w-[420px] shrink-0 min-h-0 flex-col">
        <KiNotfallPanel
          kiLaed={kiLaed}
          kiStream={kiStream}
          kiAntwort={kiAntwort}
          onNeuAnalysieren={() => void notfallAusloesen()}
          kommunikationWhatsapp={kommunikationWhatsapp}
          zusammenfassungOverride={zusammenfassungFakten}
          risikenOverride={risikenFakten}
          kommunikationOverride={kommunikationFakten}
        />
      </div>
    </div>
  );
}
