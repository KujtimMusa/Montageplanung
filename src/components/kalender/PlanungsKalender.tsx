"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
} from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { ortLabelFromProjektJoin } from "@/lib/planung/ort-label";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { bumpProjektGeplantWennNeu } from "@/lib/planung/bump-projekt-geplant";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  EinsatzNeuDialog,
  type BearbeitenZuweisung,
  type ProjektOption,
  type TeamOption,
} from "@/components/kalender/EinsatzNeuDialog";
import { PlanungsToolbar } from "@/components/kalender/PlanungsToolbar";
import {
  PlanungWochenRaster,
  formatPlanungWocheLabel,
} from "@/components/kalender/PlanungWochenRaster";
import { PlanungMonatsRaster } from "@/components/kalender/PlanungMonatsRaster";
import { ProjekteSidebar } from "@/components/kalender/ProjekteSidebar";
import { TeamsSidebar } from "@/components/kalender/TeamsSidebar";
import { EinsatzEventDetailFloating } from "@/components/kalender/EinsatzEventDetail";
import type { AbwesenheitRow, EinsatzEvent } from "@/types/planung";
import {
  subcontractorRowToDienstleister,
  type Dienstleister,
} from "@/types/dienstleister";

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
  const farbeRaw = (p.farbe as string | null | undefined) ?? null;
  return {
    id: p.id as string,
    title: p.title as string,
    status: (p.status as string) ?? "neu",
    priority: (p.priority as string) ?? "normal",
    customerLabel: (c?.company_name as string) ?? "",
    farbe: farbeRaw?.trim() ? farbeRaw.trim() : null,
  };
}

function parseTeamMitglieder(team: unknown): { id: string; name: string }[] {
  const t = team as
    | { team_members?: Array<{ employees?: unknown }> }
    | null
    | undefined;
  if (!t?.team_members?.length) return [];
  const out: { id: string; name: string }[] = [];
  for (const tm of t.team_members) {
    const e = tm.employees;
    const emp = Array.isArray(e) ? e[0] : e;
    const id = (emp as { id?: string })?.id;
    const name = (emp as { name?: string })?.name;
    if (id && name) out.push({ id, name });
  }
  return out;
}

export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [teamsListe, setTeamsListe] = useState<TeamOption[]>([]);
  const [zuweisungen, setZuweisungen] = useState<EinsatzEvent[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<AbwesenheitRow[]>([]);
  const [projekteAktiv, setProjekteAktiv] = useState<ProjektOption[]>([]);
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

  const [wocheAnker, setWocheAnker] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [monatAnker, setMonatAnker] = useState(() => startOfMonth(new Date()));

  const projekteById = useMemo(() => {
    const m = new Map<string, ProjektOption>();
    for (const p of projekteAktiv) {
      m.set(p.id, p);
    }
    return m;
  }, [projekteAktiv]);

  const toolbarZeitraum = useMemo(() => {
    if (kalenderAnsicht === "week") return formatPlanungWocheLabel(wocheAnker);
    return format(monatAnker, "MMMM yyyy", { locale: de });
  }, [kalenderAnsicht, wocheAnker, monatAnker]);

  useEffect(() => {
    if (kalenderAnsicht !== "week") return;
    const start = wocheAnker;
    const end = addDays(wocheAnker, 7);
    setSichtbarerZeitraum({ start, end });
  }, [kalenderAnsicht, wocheAnker]);

  useEffect(() => {
    if (kalenderAnsicht !== "month") return;
    const start = startOfMonth(monatAnker);
    const end = addDays(endOfMonth(monatAnker), 1);
    setSichtbarerZeitraum({ start, end });
  }, [kalenderAnsicht, monatAnker]);

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
              .select(
                "team_id,employee_id,employees!employee_id(id,name)"
              )
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
      setMitgliederByTeam(mitgliederMap);

      const memberIds = Array.from(
        new Set((tmRows ?? []).map((r) => r.employee_id as string))
      );

      let abwesenheitenListe: AbwesenheitRow[] = [];
      if (memberIds.length > 0) {
        const { data: abw, error: abwErr } = await supabase
          .from("absences")
          .select(
            "employee_id,start_date,end_date,type,employee:employees!employee_id(name)"
          )
          .in("employee_id", memberIds);
        if (!abwErr && abw) {
          abwesenheitenListe = (abw ?? []).map((row) => {
            const e = row.employee as
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
        }
      }

      const projektSelect =
        "id,title,status,priority,planned_start,planned_end,notes,farbe,customers(company_name,address,city)";

      const { data: allProjRows, error: prErr } = await supabase
        .from("projects")
        .select(projektSelect)
        .order("title");

      const alleOhneArchiv = ((allProjRows ?? []) as Record<string, unknown>[]).filter(
        (p) => String(p.status ?? "").toLowerCase() !== "archiviert"
      );

      if (prErr) {
        toast.error(`Projekte konnten nicht geladen werden: ${prErr.message}`);
        setProjekteAktiv([]);
      } else {
        setProjekteAktiv(alleOhneArchiv.map((row) => mapProjektRow(row)));
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
        "id,employee_id,project_id,project_title,team_id,dienstleister_id,date,start_time,end_time,notes,prioritaet, projects(id,title,farbe,adresse,priority,status,notes, customers(address,city,company_name)), teams!team_id(id,name,farbe,team_members(employees!employee_id(id,name))), subcontractors(company_name)";
      const selectOhnePrioritaet =
        "id,employee_id,project_id,project_title,team_id,dienstleister_id,date,start_time,end_time,notes, projects(id,title,farbe,adresse,priority,status,notes, customers(address,city,company_name)), teams!team_id(id,name,farbe,team_members(employees!employee_id(id,name))), subcontractors(company_name)";

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
                id?: string;
                title?: string;
                farbe?: string | null;
                adresse?: string | null;
                notes?: string | null;
                priority?: string | null;
                status?: string | null;
                customers?: unknown;
              }
            | {
                id?: string;
                title?: string;
                farbe?: string | null;
                adresse?: string | null;
                notes?: string | null;
                priority?: string | null;
                status?: string | null;
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
            | { id?: string; name?: string; farbe?: string; team_members?: unknown }
            | { id?: string; name?: string; farbe?: string; team_members?: unknown }[]
            | null;
          const team = Array.isArray(t) ? t[0] : t;
          const mitglieder = team ? parseTeamMitglieder(team) : [];
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
                farbe: projekt.farbe ?? null,
                adresse: projekt.adresse ?? null,
                status: projekt.status ?? null,
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
          const tid = row.team_id as string | null;
          const hatKonflikt = tid
            ? teamHatKonflikt(tid, row.date as string, map, abwesenheitenListe)
            : false;
          return {
            id: row.id as string,
            employee_id: (row.employee_id as string | null) ?? null,
            project_id: (row.project_id as string | null) ?? null,
            project_title: (row.project_title as string | null) ?? null,
            team_id: tid,
            dienstleister_id: (row.dienstleister_id as string | null) ?? null,
            date: row.date as string,
            start_time: row.start_time as string,
            end_time: row.end_time as string,
            notes: (row.notes as string | null) ?? null,
            prioritaet: (row as { prioritaet?: string | null }).prioritaet ?? null,
            ortLabel: ortLabel || null,
            hatKonflikt,
            projects: projectsNested,
            teams: team?.name
              ? {
                  id: team.id as string | undefined,
                  name: team.name as string,
                  farbe: team.farbe as string | undefined,
                  mitglieder,
                }
              : null,
            dienstleister: subcontractor?.company_name
              ? { company_name: subcontractor.company_name as string }
              : null,
          };
        });
        setZuweisungen(normalisiert);
      }

      setAbwesenheiten(abwesenheitenListe);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
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

  const einsatzCountByProjektImRaster = useMemo(() => {
    const acc: Record<string, number> = {};
    if (!sichtbarerZeitraum) return acc;
    const start = format(sichtbarerZeitraum.start, "yyyy-MM-dd");
    const end = format(addDays(sichtbarerZeitraum.end, -1), "yyyy-MM-dd");
    for (const z of zuweisungen) {
      if (!z.project_id) continue;
      if (z.date < start || z.date > end) continue;
      acc[z.project_id] = (acc[z.project_id] ?? 0) + 1;
    }
    return acc;
  }, [zuweisungen, sichtbarerZeitraum]);

  const rasterZeitraumLabel = useMemo(() => {
    if (kalenderAnsicht === "week") return "diese Woche";
    return `im ${format(monatAnker, "MMMM yyyy", { locale: de })}`;
  }, [kalenderAnsicht, monatAnker]);

  const einsatzCountByProjekt = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const z of zuweisungen) {
      if (!z.project_id) continue;
      acc[z.project_id] = (acc[z.project_id] ?? 0) + 1;
    }
    return acc;
  }, [zuweisungen]);

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

  const teamAufZelleLegen = useCallback(
    async (teamId: string, projectId: string, datum: string): Promise<void> => {
      if (projectId === "_leer") return;
      const exists = zuweisungen.some(
        (z) =>
          z.team_id === teamId &&
          z.project_id === projectId &&
          z.date === datum
      );
      if (exists) {
        toast.info(
          "Team ist an diesem Tag für dieses Projekt bereits eingeplant."
        );
        return;
      }
      const empId = await getRepresentativeEmployeeId(supabase, teamId);
      if (!empId) {
        toast.error("Kein Mitarbeiter für dieses Team hinterlegt.");
        return;
      }
      const startNorm = "07:00:00";
      const endNorm = "16:00:00";
      const k = await pruefeEinsatzKonflikt(supabase, {
        mitarbeiterId: empId,
        datum,
        startZeit: startNorm,
        endZeit: endNorm,
      });
      if (k.hatKonflikt) {
        toast.warning(k.nachricht);
        return;
      }
      const insertPayload: Record<string, unknown> = {
        employee_id: empId,
        project_id: projectId,
        project_title: null,
        team_id: teamId,
        dienstleister_id: null,
        date: datum,
        start_time: startNorm,
        end_time: endNorm,
        notes: null,
      };
      if (eigeneMitarbeiterId) insertPayload.created_by = eigeneMitarbeiterId;

      const { error } = await supabase.from("assignments").insert(insertPayload);
      if (error) {
        if (error.message.includes("prioritaet") || error.code === "42703") {
          delete insertPayload.prioritaet;
          const { error: e2 } = await supabase
            .from("assignments")
            .insert(insertPayload);
          if (e2) {
            toast.error(e2.message);
            return;
          }
        } else {
          toast.error(error.message);
          return;
        }
      }
      await bumpProjektGeplantWennNeu(supabase, projectId);
      const teamName =
        teamsListe.find((t) => t.id === teamId)?.name ?? "Team";
      toast.success(`Team „${teamName}“ wurde zugewiesen.`);
      void laden();
    },
    [zuweisungen, supabase, laden, eigeneMitarbeiterId, teamsListe]
  );

  const dialogNeuOeffnen = useCallback(
    (v: {
      date: string;
      team_id?: string;
      projekt_id?: string;
      start_time?: string;
      end_time?: string;
      dienstleister_id?: string;
      dienstleister_name?: string;
    }) => {
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
    },
    [teamsListe]
  );

  const setzeAnsicht = useCallback((art: "week" | "month") => {
    if (art === "month") {
      setMonatAnker(startOfMonth(wocheAnker));
    } else {
      setWocheAnker(startOfWeek(monatAnker, { weekStartsOn: 1 }));
    }
    setKalenderAnsicht(art);
  }, [wocheAnker, monatAnker]);

  const handlePrev = useCallback(() => {
    if (kalenderAnsicht === "week") {
      setWocheAnker((d) => addDays(d, -7));
      return;
    }
    setMonatAnker((d) => addMonths(d, -1));
  }, [kalenderAnsicht]);

  const handleNext = useCallback(() => {
    if (kalenderAnsicht === "week") {
      setWocheAnker((d) => addDays(d, 7));
      return;
    }
    setMonatAnker((d) => addMonths(d, 1));
  }, [kalenderAnsicht]);

  const handleHeute = useCallback(() => {
    const heute = new Date();
    setWocheAnker(startOfWeek(heute, { weekStartsOn: 1 }));
    setMonatAnker(startOfMonth(heute));
  }, []);

  const beiDragOderResize = useCallback(
    async (
      id: string,
      newProjectId: string,
      start: Date,
      ende: Date
    ): Promise<boolean> => {
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
        mitarbeiterId: empId ?? null,
        datum,
        startZeit,
        endZeit,
        ausserhalbEinsatzId: id,
      });
      if (k.hatKonflikt) {
        toast.warning(k.nachricht);
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
    },
    [zuweisungen, supabase, laden]
  );

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

  const oeffneBearbeitenEinsatz = useCallback((z: EinsatzEvent) => {
    if (!z.team_id && !z.dienstleister_id) return;
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
  }, []);

  const loeschenEinsatzSchnell = useCallback(
    async (z: EinsatzEvent) => {
      if (!globalThis.confirm("Einsatz wirklich löschen?")) return;
      const { error } = await supabase.from("assignments").delete().eq("id", z.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Einsatz gelöscht.");
      void laden();
    },
    [supabase, laden]
  );

  const onEinsatzDragStartHandler = useCallback(
    (e: ReactDragEvent, z: EinsatzEvent) => {
      e.dataTransfer.setData(
        "application/x-planung-einsatz",
        JSON.stringify({ id: z.id })
      );
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const oeffneEinsatzDetail = useCallback(
    (z: EinsatzEvent, anchor: HTMLElement) => {
      if (!z.team_id && !z.dienstleister_id) return;
      const rect = anchor.getBoundingClientRect();
      setDetailZuweisung(z);
      setDetailPosition({ top: rect.bottom + 4, left: rect.left });
      setDetailOffen(true);
    },
    []
  );

  useEffect(() => {
    const root = document.getElementById("kalender-container");
    if (!root) return;

    const onDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types ?? [];
      if (
        types.includes("application/json") ||
        types.includes("application/team") ||
        types.includes("application/x-planung-einsatz")
      ) {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = types.includes("application/x-planung-einsatz")
            ? "move"
            : "copy";
        }
      }
    };

    const onDrop = (e: DragEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;

      const planDrop = el.closest("[data-planung-drop]") as HTMLElement | null;
      if (
        planDrop &&
        (kalenderAnsicht === "week" || kalenderAnsicht === "month")
      ) {
        e.preventDefault();
        const datum = planDrop.dataset.datum;
        if (!datum) return;
        const emptyRow = planDrop.dataset.emptyRow === "1";
        const rowProjektId = planDrop.dataset.projektId;

        const rawEinsatz = e.dataTransfer?.getData("application/x-planung-einsatz");
        if (rawEinsatz) {
          let einsatzId: string;
          try {
            einsatzId = (JSON.parse(rawEinsatz) as { id: string }).id;
          } catch {
            return;
          }
          const z = zuweisungen.find((x) => x.id === einsatzId);
          if (!z) return;
          const newProjectId = emptyRow
            ? (z.project_id ?? "")
            : (rowProjektId ?? z.project_id ?? "");
          if (!newProjectId || newProjectId === "_leer") {
            toast.info("Ungültige Zelle.");
            return;
          }
          const tStart = z.start_time ?? "07:00:00";
          const tEnd = z.end_time ?? "16:00:00";
          const start = parseISO(
            `${datum}T${tStart.length === 5 ? `${tStart}:00` : tStart.slice(0, 8)}`
          );
          const end = parseISO(
            `${datum}T${tEnd.length === 5 ? `${tEnd}:00` : tEnd.slice(0, 8)}`
          );
          void beiDragOderResize(einsatzId, newProjectId, start, end);
          return;
        }

        const rawTeam = e.dataTransfer?.getData("application/team");
        if (rawTeam) {
          if (emptyRow || !rowProjektId) {
            toast.info(
              "Team auf einen Einsatz unter einem Projekt ziehen (nicht die gestrichelte Freizeile)."
            );
            return;
          }
          let teamPayload: { teamId?: string };
          try {
            teamPayload = JSON.parse(rawTeam) as { teamId?: string };
          } catch {
            return;
          }
          const teamId = teamPayload.teamId;
          if (!teamId) return;
          void teamAufZelleLegen(teamId, rowProjektId, datum);
          return;
        }

        const raw = e.dataTransfer?.getData("application/json");
        if (!raw) return;
        e.preventDefault();

        let parsed: {
          title?: string;
          extendedProps?: {
            projektId?: string;
            projectId?: string;
            teamId?: string;
            typ?: string;
            dienstleisterId?: string;
          };
        };
        try {
          parsed = JSON.parse(raw) as typeof parsed;
        } catch {
          toast.error("Ungültige Drag-Daten. Bitte erneut ziehen.");
          return;
        }

        const ep = parsed.extendedProps ?? {};

        if (ep.typ === "dienstleister" && ep.dienstleisterId) {
          if (!rowProjektId || rowProjektId === "_leer") {
            toast.info("Auf einen Einsatz unter einem Projekt ziehen.");
            return;
          }
          dialogNeuOeffnen({
            projekt_id: rowProjektId,
            dienstleister_id: ep.dienstleisterId,
            dienstleister_name: parsed.title,
            date: datum,
            start_time: "07:00",
            end_time: "16:00",
          });
          return;
        }

        const teamFromDrag = ep.teamId;
        if (teamFromDrag) {
          if (!rowProjektId) {
            toast.info("Auf einen Einsatz unter einem Projekt ziehen.");
            return;
          }
          void teamAufZelleLegen(teamFromDrag, rowProjektId, datum);
          return;
        }

        const projectId = ep.projektId ?? ep.projectId;
        if (!projectId) {
          toast.error("Kein Projekt in den Drag-Daten.");
          return;
        }
        dialogNeuOeffnen({
          projekt_id: projectId,
          team_id: teamsListe[0]?.id,
          date: datum,
          start_time: "07:00",
          end_time: "16:00",
        });
        return;
      }
    };

    root.addEventListener("dragover", onDragOver);
    root.addEventListener("drop", onDrop);
    return () => {
      root.removeEventListener("dragover", onDragOver);
      root.removeEventListener("drop", onDrop);
    };
  }, [
    kalenderAnsicht,
    teamsListe,
    dialogNeuOeffnen,
    teamAufZelleLegen,
    zuweisungen,
    beiDragOderResize,
  ]);

  const sidebarZeitraumIso = useMemo(() => {
    if (sichtbarerZeitraum) {
      return {
        von: format(sichtbarerZeitraum.start, "yyyy-MM-dd"),
        bis: format(addDays(sichtbarerZeitraum.end, -1), "yyyy-MM-dd"),
      };
    }
    const ws = wocheAnker;
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    return {
      von: format(ws, "yyyy-MM-dd"),
      bis: format(we, "yyyy-MM-dd"),
    };
  }, [sichtbarerZeitraum, wocheAnker]);

  const kalenderInhalt = !kalenderBereit ? (
    <div className="space-y-2 py-8">
      <Skeleton className="h-10 w-full bg-zinc-800" />
      <Skeleton className="h-64 w-full bg-zinc-800" />
    </div>
  ) : kalenderAnsicht === "week" ? (
    <PlanungWochenRaster
      wocheStart={wocheAnker}
      zuweisungen={zuweisungen}
      projekteById={projekteById}
      abwesenheitCountProTag={abwesenheitCountProTag}
      onEinsatzBearbeiten={oeffneBearbeitenEinsatz}
      onEinsatzLoeschen={loeschenEinsatzSchnell}
      onEinsatzDragStart={onEinsatzDragStartHandler}
      onEinsatzDetail={oeffneEinsatzDetail}
    />
  ) : (
    <PlanungMonatsRaster
      monatAnker={monatAnker}
      zuweisungen={zuweisungen}
      projekteById={projekteById}
      abwesenheitCountProTag={abwesenheitCountProTag}
      onEinsatzBearbeiten={oeffneBearbeitenEinsatz}
      onEinsatzLoeschen={loeschenEinsatzSchnell}
      onEinsatzDragStart={onEinsatzDragStartHandler}
      onEinsatzDetail={oeffneEinsatzDetail}
    />
  );

  return (
    <div className="flex h-[calc(100vh-60px)] min-h-[480px] max-h-[calc(100dvh-4rem)] flex-col gap-0 md:max-h-[calc(100dvh-5rem)]">
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950">
        <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-950">
          <ProjekteSidebar
            projekteAlle={projekteAktiv}
            einsatzCountByProjektImRaster={einsatzCountByProjektImRaster}
            einsatzCountByProjekt={einsatzCountByProjekt}
            rasterZeitraumLabel={rasterZeitraumLabel}
          />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950">
          <div
            className="planung-sf flex min-h-0 flex-1 flex-col overflow-hidden"
            id="kalender-container"
          >
            <PlanungsToolbar
              zeitraumLabel={toolbarZeitraum}
              ansicht={kalenderAnsicht}
              onAnsicht={setzeAnsicht}
              onPrev={handlePrev}
              onNext={handleNext}
              onHeute={handleHeute}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {kalenderInhalt}
            </div>
          </div>
        </main>

        <aside className="flex w-64 shrink-0 flex-col border-l border-zinc-800/60 bg-zinc-950">
          <TeamsSidebar
            teams={teamSidebarEintraege}
            dienstleister={dienstleisterListe}
            einsaetzeProTeamZeitraum={einsaetzeProTeamZeitraum}
            heuteEinsaetze={heuteEinsaetzeAnzahl}
            heuteAbwesenheiten={heuteAbwesenheitenAnzahl}
            zuweisungen={zuweisungen}
            abwesenheiten={abwesenheiten}
            sichtbarVon={sidebarZeitraumIso.von}
            sichtbarBis={sidebarZeitraumIso.bis}
          />
        </aside>
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
