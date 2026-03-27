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

  const [kiLaed, setKiLaed] = useState(false);
  const [kiStream, setKiStream] = useState("");
  const [kiAntwort, setKiAntwort] = useState<KiNotfallAntwort | null>(null);
  const [kiErsatz, setKiErsatz] = useState<Record<string, KiErsatzKarte>>({});
  const [manuellerErsatz, setManuellerErsatz] = useState<Record<string, string>>(
    {}
  );

  const absenceEingetragenRef = useRef(false);

  const ausfall = useMemo(
    () => mitarbeiter.find((m) => m.id === ausfallId),
    [mitarbeiter, ausfallId]
  );

  const schritt = useMemo(() => {
    if (!ausfallId) return 0;
    if (!betroffeneGeladen) return 1;
    if (einsätze.length === 0) return 2;
    return 3;
  }, [ausfallId, betroffeneGeladen, einsätze.length]);

  const kommunikationWhatsapp = useMemo(() => {
    const first = kiAntwort?.empfehlungen?.[0];
    if (!first?.employeeId) return null;
    return mitarbeiter.find((m) => m.id === first.employeeId)?.whatsapp ?? null;
  }, [kiAntwort, mitarbeiter]);

  const ladenMitarbeiter = useCallback(async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id,name,department_id,qualifikationen,phone,whatsapp,departments(name)")
      .eq("active", true)
      .order("name");
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    setMitarbeiter(
      rows.map((row) => {
        const depRaw = row.departments as
          | { name?: string }
          | { name?: string }[]
          | null;
        const dep = Array.isArray(depRaw) ? depRaw[0] : depRaw;
        return {
          id: row.id as string,
          name: row.name as string,
          department_id: (row.department_id as string | null) ?? null,
          qualifikationen: (row.qualifikationen as string[] | null) ?? null,
          phone: (row.phone as string | null) ?? null,
          whatsapp: (row.whatsapp as string | null) ?? null,
          abteilung: dep?.name ?? null,
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
        const { data, error } = await supabase
          .from("assignments")
          .select(
            "id,date,start_time,end_time,project_id,project_title, projects(title), teams(name)"
          )
          .eq("employee_id", ausfallId)
          .eq("date", datum);

        if (error) throw error;

        const rows: NotfallEinsatzZeile[] = (data ?? []).map(
          (row: Record<string, unknown>) => {
            const p = row.projects;
            const proj = Array.isArray(p) ? p[0] : p;
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
              projects: proj as { title: string } | null,
              teamName: team?.name ? String(team.name) : null,
            };
          }
        );

        setEinsätze(rows);
        setBetroffeneGeladen(true);

        const dept = ausfall?.department_id;
        const kandidatenBasis = mitarbeiter.filter(
          (m) =>
            m.id !== ausfallId && m.department_id && m.department_id === dept
        );

        const map: KandidatenMap = {};
        for (const e of rows) {
          const ok: { id: string; name: string }[] = [];
          for (const k of kandidatenBasis) {
            const pr = await pruefeEinsatzKonflikt(supabase, {
              mitarbeiterId: k.id,
              datum,
              startZeit: e.start_time,
              endZeit: e.end_time,
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
        return { rows, kandidaten: map };
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
    const payload = {
      ausfallMitarbeiter: {
        id: ausfallMitarbeiter?.id ?? ausfallId,
        name: ausfallMitarbeiter?.name ?? "",
        abteilung: ausfallMitarbeiter?.abteilung ?? "",
        qualifikationen: ausfallMitarbeiter?.qualifikationen ?? [],
      },
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

  async function ersatzBestaetigen(einsatzId: string) {
    const ki = kiErsatz[einsatzId];
    const manual = manuellerErsatz[einsatzId];
    const ersatzId = manual ?? ki?.employeeId;
    if (!ersatzId) {
      toast.error("Ersatz wählen.");
      return;
    }
    const name = mitarbeiter.find((m) => m.id === ersatzId)?.name ?? "Ersatz";
    setLädt(true);
    try {
      const { error } = await supabase
        .from("assignments")
        .update({ employee_id: ersatzId })
        .eq("id", einsatzId);
      if (error) throw error;
      await absenceEinmalig();
      toast.success(`Ersatz bestätigt — ${name} übernimmt den Einsatz.`);
      void betroffeneLaden({ silent: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Zuweisung fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  async function alleKiErsatzBestaetigen() {
    const jobs: Promise<void>[] = [];
    for (const e of einsätze) {
      const ki = kiErsatz[e.id];
      const manual = manuellerErsatz[e.id];
      const ersatzId = manual ?? ki?.employeeId;
      if (!ersatzId) continue;
      jobs.push(
        (async () => {
          const { error } = await supabase
            .from("assignments")
            .update({ employee_id: ersatzId })
            .eq("id", e.id);
          if (error) throw error;
        })()
      );
    }
    if (jobs.length === 0) {
      toast.info("Keine KI-Empfehlungen zum Übernehmen.");
      return;
    }
    setLädt(true);
    try {
      await Promise.all(jobs);
      await absenceEinmalig();
      toast.success(`Alle ${jobs.length} Ersatzplanungen übernommen.`);
      void betroffeneLaden({ silent: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Batch fehlgeschlagen.";
      toast.error(msg);
    } finally {
      setLädt(false);
    }
  }

  return (
    <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      <NotfallSteuerung
        mitarbeiter={mitarbeiter}
        ausfallId={ausfallId}
        setAusfallId={setAusfallId}
        datum={datum}
        setDatum={setDatum}
        schritt={schritt}
        kiLaed={kiLaed}
        onNotfallAnalysieren={() => void notfallAusloesen()}
        einsätze={einsätze}
        kandidatenProEinsatz={kandidatenProEinsatz}
        kiErsatz={kiErsatz}
        manuellerErsatz={manuellerErsatz}
        ersatzManuellSetzen={ersatzManuellSetzen}
        ersatzBestaetigen={(id) => void ersatzBestaetigen(id)}
        alleKiErsatzBestaetigen={() => void alleKiErsatzBestaetigen()}
        lädt={lädt}
      />
      <KiNotfallPanel
        kiLaed={kiLaed}
        kiStream={kiStream}
        kiAntwort={kiAntwort}
        onNeuAnalysieren={() => void notfallAusloesen()}
        kommunikationWhatsapp={kommunikationWhatsapp}
      />
    </div>
  );
}
