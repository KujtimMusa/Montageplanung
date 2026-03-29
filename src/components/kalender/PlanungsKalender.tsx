"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ScheduleComponent,
  ViewsDirective,
  ViewDirective,
  ResourcesDirective,
  ResourceDirective,
  Inject,
  TimelineViews,
  TimelineMonth,
  Resize,
  DragAndDrop,
} from "@syncfusion/ej2-react-schedule";
import type {
  CellClickEventArgs,
  DragEventArgs,
  EventClickArgs,
  PopupOpenEventArgs,
  ResizeEventArgs,
} from "@syncfusion/ej2-schedule";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { CircleHelp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ortLabelFromProjektJoin } from "@/lib/planung/ort-label";
import { PRIORITAET_FARBEN } from "@/lib/constants/planung-farben";
import { pruefeEinsatzKonflikt } from "@/lib/utils/conflicts";
import { getRepresentativeEmployeeId } from "@/lib/planung/team-representative";
import { registerSyncfusion } from "@/lib/syncfusion/register";
import {
  transformiereEinsatz,
  type SyncfusionEvent,
} from "@/lib/syncfusion/transform";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import type { AbwesenheitRow, EinsatzEvent } from "@/types/planung";
import {
  subcontractorRowToDienstleister,
  type Dienstleister,
} from "@/types/dienstleister";
import { useDefaultLayout } from "react-resizable-panels";

registerSyncfusion();

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

function projektBalkenFarbe(z: EinsatzEvent): string {
  const pf = z.projects?.farbe?.trim();
  if (pf) return pf;
  const prio = z.projects?.priority ?? "normal";
  return PRIORITAET_FARBEN[prio] ?? "#3b82f6";
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

function hexSuffix(farbe: string, suf: string): string {
  const f = farbe.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(f) ? `${f}${suf}` : "#3b82f682";
}

function statusFarbeRessource(status: string | undefined): string {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    neu: "#52525b",
    offen: "#3b82f6",
    geplant: "#10b981",
    aktiv: "#10b981",
    abgeschlossen: "#22c55e",
    kritisch: "#ef4444",
  };
  return map[s] ?? "#52525b";
}

function RessourceHeaderTemplate(
  props: Record<string, unknown> & {
    resourceData?: Record<string, unknown>;
  }
) {
  const projekt = (props.resourceData ?? props) as Record<string, unknown>;
  const platzhalter = Boolean(projekt.platzhalter);
  const titel = String(projekt.title ?? projekt.Subject ?? "");
  const st = String(projekt.status ?? "neu");
  const punkt =
    String(projekt.farbe ?? "").trim() ||
    String(projekt.prioFarbe ?? "").trim() ||
    "#3b82f6";
  const statusFarbe = statusFarbeRessource(st);
  const statusLabel = st || "offen";

  if (platzhalter) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <span style={{ fontSize: 12, color: "#71717a" }}>{titel}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: punkt,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#e4e4e7",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {titel}
        </div>
        <div
          style={{
            fontSize: 10,
            color: statusFarbe,
            marginTop: 1,
            fontWeight: 500,
            textTransform: "capitalize",
          }}
        >
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

function EinsatzTemplate(props: Record<string, unknown>) {
  const e = props as SyncfusionEvent;
  const farbe = (e.TeamFarbe as string) ?? "#3b82f6";
  const kompakt = Boolean(e.KompaktMonat);
  const titel =
    String(e.ProjektTitel ?? "").trim() ||
    String(e.Subject ?? "").split(" · ")[0] ||
    "Einsatz";
  const zeit = String(e.ZeitLabel ?? "");
  const ort = String(e.OrtLabel ?? "");
  const hatKonflikt = Boolean(e.HatKonflikt);
  const kritisch = Boolean(e.Kritisch);

  if (kompakt) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "22px",
          borderRadius: "4px",
          overflow: "hidden",
          background: hexSuffix(farbe, "18"),
          cursor: "pointer",
          position: "relative",
        }}
        title={titel}
      >
        <div
          style={{
            width: "3px",
            height: "100%",
            background: farbe,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "#e4e4e7",
            padding: "0 6px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            lineHeight: "22px",
          }}
        >
          {titel}
        </span>
        {hatKonflikt ? (
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#f97316",
              marginRight: "5px",
              flexShrink: 0,
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        borderRadius: "6px",
        overflow: "hidden",
        background: hexSuffix(farbe, "12"),
        border: `1px solid ${hexSuffix(farbe, "25")}`,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
      }}
      title={[titel, zeit, ort].filter(Boolean).join(" · ")}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: kritisch ? "#ef4444" : farbe,
          borderRadius: "6px 0 0 6px",
        }}
      />

      <div style={{ padding: "6px 8px 6px 11px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#f4f4f5",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "4px",
          }}
        >
          {titel}
        </div>

        <div
          style={{
            display: "flex",
            gap: "4px",
            flexWrap: "wrap",
            marginBottom: "4px",
          }}
        >
          {e.RolleName ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: farbe,
                background: hexSuffix(farbe, "20"),
                padding: "1px 5px",
                borderRadius: "3px",
                border: `1px solid ${hexSuffix(farbe, "30")}`,
              }}
            >
              {e.RolleTag} {e.RolleName}
            </span>
          ) : null}
          {hatKonflikt ? (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "#f97316",
                background: "#f9731610",
                padding: "1px 5px",
                borderRadius: "3px",
                border: "1px solid #f9731630",
              }}
            >
              ⚠ Konflikt
            </span>
          ) : null}
        </div>

        {zeit ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              color: "#71717a",
            }}
          >
            <span>⏱</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{zeit}</span>
          </div>
        ) : null}

        {ort ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              color: "#71717a",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span>📍</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {ort}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PlanungsKalender() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const scheduleRef = useRef<ScheduleComponent>(null);
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

  const [zeitraumLabel, setZeitraumLabel] = useState("");

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
            employee_id: row.employee_id as string,
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

  const projektRessourcenSf = useMemo(() => {
    if (projekteAktiv.length === 0) {
      return [
        {
          Id: "_leer",
          Subject: "Keine Projekte",
          title: "Keine Projekte",
          status: "neu",
          farbe: "#64748b",
          prioFarbe: "#64748b",
          platzhalter: true,
          kunde: "",
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
      const prioFarbe =
        PRIORITAET_FARBEN[prio] ?? PRIORITAET_FARBEN.normal ?? "#3b82f6";
      const projektHex = p.farbe?.trim();
      return {
        Id: p.id,
        Subject: p.title,
        title: p.title,
        status: p.status ?? "neu",
        farbe: projektHex || prioFarbe,
        prioFarbe,
        platzhalter: false,
        kunde: p.customerLabel?.trim() || "",
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

  const einsatzCountByProjektWoche = useMemo(() => {
    const acc: Record<string, number> = {};
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    for (const z of zuweisungen) {
      if (!z.project_id) continue;
      if (z.date < start || z.date > end) continue;
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

  const syncfusionEvents: SyncfusionEvent[] = useMemo(() => {
    const kompakt = kalenderAnsicht === "month";
    return zuweisungen
      .filter((z) => z.project_id)
      .map((z) => {
        const barFarbe = projektBalkenFarbe(z);
        const hatKonflikt = z.hatKonflikt ?? false;
        return transformiereEinsatz(z, hatKonflikt, barFarbe, kompakt);
      });
  }, [zuweisungen, kalenderAnsicht]);

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
        toast.error(k.nachricht);
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
      toast.success("Einsatz mit Team ergänzt.");
      void laden();
    },
    [zuweisungen, supabase, laden, eigeneMitarbeiterId]
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

  const syncZeitraumFromSchedule = useCallback(() => {
    const sch = scheduleRef.current;
    if (!sch) return;
    const dates = sch.getCurrentViewDates();
    if (!dates?.length) return;
    const start = dates[0];
    const end = dates[dates.length - 1];
    setSichtbarerZeitraum({ start, end: addDays(end, 1) });
    if (kalenderAnsicht === "week") {
      setZeitraumLabel(
        `${format(start, "d.", { locale: de })} – ${format(end, "d. MMMM yyyy", { locale: de })}`
      );
    } else {
      setZeitraumLabel(format(start, "MMMM yyyy", { locale: de }));
    }
  }, [kalenderAnsicht]);

  const setzeAnsicht = useCallback(
    (art: "week" | "month") => {
      setKalenderAnsicht(art);
      const sch = scheduleRef.current;
      if (!sch) return;
      sch.changeView(art === "week" ? "TimelineWeek" : "TimelineMonth");
    },
    []
  );

  const handlePrev = useCallback(() => {
    const sch = scheduleRef.current;
    if (!sch) return;
    const d = new Date(sch.selectedDate);
    if (kalenderAnsicht === "week") {
      sch.changeDate(addDays(d, -7));
    } else {
      sch.changeDate(addMonths(d, -1));
    }
  }, [kalenderAnsicht]);

  const handleNext = useCallback(() => {
    const sch = scheduleRef.current;
    if (!sch) return;
    const d = new Date(sch.selectedDate);
    if (kalenderAnsicht === "week") {
      sch.changeDate(addDays(d, 7));
    } else {
      sch.changeDate(addMonths(d, 1));
    }
  }, [kalenderAnsicht]);

  const handleHeute = useCallback(() => {
    scheduleRef.current?.changeDate(new Date());
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
    },
    [zuweisungen, supabase, laden]
  );

  const projektIdByGroupIndex = useCallback(
    (groupIndex: number | undefined) => {
      if (groupIndex === undefined || groupIndex < 0) return null;
      return projektRessourcenSf[groupIndex]?.Id ?? null;
    },
    [projektRessourcenSf]
  );

  const onDragStop = useCallback(
    async (args: DragEventArgs) => {
      args.cancel = true;
      const raw = args.data as Record<string, unknown>;
      const id = String(raw.Id ?? "");
      const gi = args.groupIndex ?? 0;
      const newProjectId = projektIdByGroupIndex(gi);
      const start = args.startTime ?? (raw.StartTime as Date);
      const ende = args.endTime ?? (raw.EndTime as Date);
      if (!id || !newProjectId || !start || !ende) return;
      await beiDragOderResize(id, newProjectId, start, ende);
    },
    [beiDragOderResize, projektIdByGroupIndex]
  );

  const onResizeStop = useCallback(
    async (args: ResizeEventArgs) => {
      args.cancel = true;
      const raw = args.data as Record<string, unknown>;
      const id = String(raw.Id ?? "");
      const gi = args.groupIndex ?? 0;
      const newProjectId = projektIdByGroupIndex(gi);
      const start = args.startTime ?? (raw.StartTime as Date);
      const ende = args.endTime ?? (raw.EndTime as Date);
      if (!id || !newProjectId || !start || !ende) return;
      await beiDragOderResize(id, newProjectId, start, ende);
    },
    [beiDragOderResize, projektIdByGroupIndex]
  );

  const onEventClick = useCallback((args: EventClickArgs) => {
    args.cancel = true;
    const raw = args.event;
    const ev = Array.isArray(raw) ? raw[0] : raw;
    const z = (ev as SyncfusionEvent | undefined)?.OriginalZuweisung;
    if (!z || (!z.team_id && !z.dienstleister_id)) return;
    const el = Array.isArray(args.element) ? args.element[0] : args.element;
    const rect = el.getBoundingClientRect();
    setDetailZuweisung(z);
    setDetailPosition({ top: rect.bottom + 4, left: rect.left });
    setDetailOffen(true);
  }, []);

  const onCellClick = useCallback(
    (args: CellClickEventArgs) => {
      args.cancel = true;
      const projId = projektIdByGroupIndex(args.groupIndex);
      if (!projId || projId === "_leer") {
        toast.info("Bitte eine Projekt-Zeile und einen Tag wählen.");
        return;
      }
      dialogNeuOeffnen({
        projekt_id: projId,
        team_id: teamsListe[0]?.id,
        date: format(args.startTime, "yyyy-MM-dd"),
        start_time: format(args.startTime, "HH:mm"),
        end_time: format(args.endTime, "HH:mm"),
      });
    },
    [projektIdByGroupIndex, teamsListe, dialogNeuOeffnen]
  );

  const onPopupOpen = useCallback((args: PopupOpenEventArgs) => {
    args.cancel = true;
  }, []);

  /** Syncfusion öffnet bei Doppelklick auf Zelle den Standard-Editor — wir nutzen nur EinsatzNeuDialog. */
  const onCellDoubleClick = useCallback((args: CellClickEventArgs) => {
    args.cancel = true;
  }, []);

  const onEventDoubleClick = useCallback((args: EventClickArgs) => {
    args.cancel = true;
  }, []);

  const onEventRendered = useCallback(
    (args: { data?: Record<string, unknown>; element: HTMLElement }) => {
      if (args.data?.HatKonflikt) {
        args.element.classList.add("e-konflikt");
      }
    },
    []
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

  const dateHeaderTemplate = useCallback(
    (props: { date?: Date }) => {
      const d = props.date;
      if (!d) return null;
      const iso = format(d, "yyyy-MM-dd");
      const absN = abwesenheitCountProTag[iso] ?? 0;
      const heute = isSameDay(d, new Date());
      const isMonth = kalenderAnsicht === "month";
      return (
        <div
          className={cn(
            "flex min-w-[3rem] flex-col items-center gap-1 py-2.5",
            isMonth && "min-w-[3.25rem] py-3"
          )}
        >
          <span
            className={cn(
              "font-semibold uppercase tracking-wider text-[#52525b]",
              isMonth ? "text-[11px]" : "text-[10px]"
            )}
          >
            {format(d, "EEE", { locale: de })}
          </span>
          <span
            className={cn(
              "flex items-center justify-center font-bold tabular-nums leading-none",
              isMonth ? "text-lg" : "text-base",
              heute
                ? "size-6 rounded-full bg-white text-black"
                : "text-[#f4f4f5]"
            )}
          >
            {format(d, "d.", { locale: de })}
          </span>
          <span
            className={cn(
              "text-zinc-500",
              isMonth ? "text-[10px] font-medium" : "text-[9px]"
            )}
          >
            {format(d, "MMM", { locale: de })}
          </span>
          {absN > 0 ? (
            <span
              className="mt-0.5 rounded-full bg-amber-500/25 px-1.5 py-px text-[9px] font-medium text-amber-300"
              title="Abwesenheiten (Team-Mitglieder)"
            >
              {absN} abw.
            </span>
          ) : null}
        </div>
      );
    },
    [abwesenheitCountProTag, kalenderAnsicht]
  );

  const eventSettings = useMemo(
    () => ({
      dataSource: syncfusionEvents,
      template: EinsatzTemplate,
      enableMaxHeight: false,
      allowAdding: false,
      allowEditing: false,
      allowDeleting: false,
      fields: {
        id: "Id",
        subject: { name: "Subject" },
        startTime: { name: "StartTime" },
        endTime: { name: "EndTime" },
      },
    }),
    [syncfusionEvents]
  );

  useEffect(() => {
    const root = document.getElementById("kalender-container");
    if (!root) return;

    const onDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types ?? [];
      if (types.includes("application/json") || types.includes("application/team")) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      }
    };

    const onDrop = (e: DragEvent) => {
      const sch = scheduleRef.current;
      if (!sch) return;

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;
      const td = el.closest("td[data-group-index]") as HTMLElement | null;
      if (!td) {
        toast.info("Auf eine Projekt-Zeile und Tag ziehen.");
        return;
      }
      const cellData = sch.getCellDetails(td);
      if (!cellData?.startTime || cellData.groupIndex === undefined) return;

      const resId = projektRessourcenSf[cellData.groupIndex]?.Id;
      if (!resId || resId === "_leer") {
        toast.info("Auf eine Projekt-Zeile und Tag ziehen.");
        return;
      }

      const start = cellData.startTime;
      const datum = format(start, "yyyy-MM-dd");

      const rawTeam = e.dataTransfer?.getData("application/team");
      if (rawTeam) {
        e.preventDefault();
        let teamPayload: { teamId?: string };
        try {
          teamPayload = JSON.parse(rawTeam) as { teamId?: string };
        } catch {
          return;
        }
        const teamId = teamPayload.teamId;
        if (!teamId) return;
        void teamAufZelleLegen(teamId, resId, datum);
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
        return;
      }

      const ep = parsed.extendedProps ?? {};

      if (ep.typ === "dienstleister" && ep.dienstleisterId) {
        dialogNeuOeffnen({
          projekt_id: resId,
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
        void teamAufZelleLegen(teamFromDrag, resId, datum);
        return;
      }

      const projectId = ep.projektId ?? ep.projectId;
      if (!projectId) return;
      dialogNeuOeffnen({
        projekt_id: projectId,
        team_id: teamsListe[0]?.id,
        date: datum,
        start_time: "07:00",
        end_time: "16:00",
      });
    };

    root.addEventListener("dragover", onDragOver);
    root.addEventListener("drop", onDrop);
    return () => {
      root.removeEventListener("dragover", onDragOver);
      root.removeEventListener("drop", onDrop);
    };
  }, [projektRessourcenSf, teamsListe, dialogNeuOeffnen, teamAufZelleLegen]);

  const kalenderInhalt = !kalenderBereit ? (
    <div className="space-y-2 py-8">
      <Skeleton className="h-10 w-full bg-zinc-800" />
      <Skeleton className="h-64 w-full bg-zinc-800" />
    </div>
  ) : (
    <div className="planung-sf flex min-h-[min(520px,50vh)] min-w-0 flex-1 flex-col">
      <ScheduleComponent
        ref={scheduleRef}
        cssClass="planung-sf-inner"
        width="100%"
        height="100%"
        firstDayOfWeek={1}
        currentView={kalenderAnsicht === "week" ? "TimelineWeek" : "TimelineMonth"}
        rowAutoHeight={false}
        showHeaderBar={false}
        showTimeIndicator
        showQuickInfo={false}
        prerenderDialogs={false}
        allowOverlap
        allowDragAndDrop
        allowResizing
        popupOpen={onPopupOpen}
        dateHeaderTemplate={dateHeaderTemplate}
        resourceHeaderTemplate={RessourceHeaderTemplate}
        eventSettings={eventSettings}
        eventClick={onEventClick}
        cellClick={onCellClick}
        cellDoubleClick={onCellDoubleClick}
        eventDoubleClick={onEventDoubleClick}
        dragStop={onDragStop}
        resizeStop={onResizeStop}
        eventRendered={onEventRendered}
        dataBound={syncZeitraumFromSchedule}
        group={{ resources: ["Projekte"], enableCompactView: false }}
      >
        <ResourcesDirective>
          <ResourceDirective
            field="ProjectId"
            title="Projekte"
            name="Projekte"
            allowMultiple={false}
            dataSource={projektRessourcenSf}
            textField="Subject"
            idField="Id"
          />
        </ResourcesDirective>
        <ViewsDirective>
          <ViewDirective
            option="TimelineWeek"
            timeScale={{ enable: false, interval: 1440, slotCount: 1 }}
            workDays={[0, 1, 2, 3, 4, 5, 6]}
            showWeekend
          />
          <ViewDirective
            option="TimelineMonth"
            workDays={[0, 1, 2, 3, 4, 5, 6]}
            showWeekend
          />
        </ViewsDirective>
        <Inject services={[TimelineViews, TimelineMonth, Resize, DragAndDrop]} />
      </ScheduleComponent>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col gap-0">
      <div className="flex shrink-0 flex-col gap-2 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <TooltipProvider>
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/90 to-zinc-950 px-3 py-2 shadow-sm">
            <span className="text-sm font-medium text-zinc-200">Kalenderplanung</span>
            <Tooltip>
              <TooltipTrigger className="inline-flex shrink-0">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full p-1 text-zinc-400 ring-offset-zinc-950 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="So funktioniert die Planung"
                >
                  <CircleHelp className="size-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                sideOffset={8}
                className="max-w-md border-zinc-600 bg-zinc-950 p-3 text-left text-xs leading-relaxed text-zinc-300"
              >
                <p className="mb-2 font-semibold text-zinc-100">So planen Sie</p>
                <ol className="list-inside list-decimal space-y-2 pl-0.5">
                  <li>
                    <span className="font-medium text-zinc-200">Mitte</span> = Kalender: jede
                    Zeile ist eine <span className="text-zinc-200">Baustelle</span>, jede Spalte
                    ein <span className="text-zinc-200">Tag</span>. Pro Einsatz entsteht eine
                    Karte; mehrere Teams oder Partner am selben Tag = mehrere Karten in der
                    Zelle (überlappend).
                  </li>
                  <li>
                    <span className="font-medium text-zinc-200">Links</span> Projekt-Karte aus
                    den Gruppen auf einen <span className="text-zinc-200">Tag</span> ziehen —
                    Formular für Uhrzeit (mehrere Teams/Partner wählbar).
                  </li>
                  <li>
                    <span className="font-medium text-zinc-200">Rechts</span>{" "}
                    <span className="text-zinc-200">Team</span> oder{" "}
                    <span className="text-zinc-200">Partner</span> auf dieselbe Zelle ziehen —
                    Karte zeigt Projekt, Team/Partner als Tag, Zeit und Ort.
                  </li>
                  <li>
                    Karte anklicken für Details;{" "}
                    <span className="text-orange-400/90">orangener Rand</span> = Abwesenheit im
                    Team.
                  </li>
                </ol>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        <div className="flex shrink-0 flex-col justify-center gap-1.5 text-right text-xs text-zinc-500 sm:min-w-[9rem]">
          <Link
            href="/teams?tab=projekte"
            className="font-medium text-blue-400 underline-offset-2 hover:underline"
          >
            Projekte anlegen
          </Link>
          <Link
            href="/teams?tab=teams"
            className="font-medium text-blue-400 underline-offset-2 hover:underline"
          >
            Teams verwalten
          </Link>
        </div>
      </div>

      <PlanungsToolbar
        zeitraumLabel={zeitraumLabel}
        ansicht={kalenderAnsicht}
        onAnsicht={setzeAnsicht}
        onPrev={handlePrev}
        onNext={handleNext}
        onHeute={handleHeute}
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
            projekteAlle={projekteAktiv}
            einsatzCountByProjektWoche={einsatzCountByProjektWoche}
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
            className="planung-sf flex min-h-0 flex-1 flex-col bg-zinc-900 p-2 md:p-4"
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
            dienstleister={dienstleisterListe}
            einsaetzeProTeamZeitraum={einsaetzeProTeamZeitraum}
            heuteEinsaetze={heuteEinsaetzeAnzahl}
            heuteAbwesenheiten={heuteAbwesenheitenAnzahl}
            zuweisungen={zuweisungen}
            abwesenheiten={abwesenheiten}
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
