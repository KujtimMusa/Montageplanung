import Link from "next/link";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ladeMonteurEinsaetzeListe } from "@/lib/pwa/monteur-einsatz-zugriff";

function initialen(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function statusFarbe(status: string): string {
  const s = status.toLowerCase();
  if (s === "aktiv") return "border-emerald-600/50 bg-emerald-950/50 text-emerald-300";
  if (s === "abgeschlossen") return "border-zinc-600 bg-zinc-800/80 text-zinc-400";
  return "border-blue-600/50 bg-blue-950/40 text-blue-300";
}

export default async function PwaProjektePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    return null;
  }
  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    return null;
  }

  const supabase = createServiceRoleClient();
  const heute = format(new Date(), "yyyy-MM-dd");
  const grenze = format(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const { rows: rowsRaw, error: listeErr } = await ladeMonteurEinsaetzeListe(
    supabase,
    {
      employeeId: resolved.employeeId,
      orgId: resolved.orgId,
      grenze,
    }
  );

  if (listeErr) {
    return (
      <div className="p-4 text-sm text-red-400">
        Einsätze konnten nicht geladen werden.
      </div>
    );
  }

  type Zeile = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    notes?: string | null;
    project_title?: string | null;
    project_id: string | null;
    projects: unknown;
  };

  const rows = (rowsRaw ?? []).filter((raw) => {
    const a = raw as Zeile;
    const st = String(a.status ?? "").toLowerCase();
    const d = a.date as string;
    if (st !== "abgeschlossen") return true;
    return d >= grenze;
  }) as Zeile[];

  const liste = rows;
  const projectIds = Array.from(
    new Set(
      liste
        .map((r) => r.project_id as string | null)
        .filter((x): x is string => Boolean(x))
    )
  );
  const dates = Array.from(new Set(liste.map((r) => r.date as string)));

  const teamMap = new Map<string, { name: string; role: string }[]>();
  if (projectIds.length > 0 && dates.length > 0) {
    const { data: peers } = await supabase
      .from("assignments")
      .select("project_id,date,employee_id, employees(name,role)")
      .in("project_id", projectIds)
      .in("date", dates)
      .neq("employee_id", resolved.employeeId);

    for (const p of peers ?? []) {
      const pid = p.project_id as string;
      const d = p.date as string;
      const key = `${pid}|${d}`;
      const emp = p.employees as
        | { name?: string; role?: string }
        | { name?: string; role?: string }[]
        | null;
      const e = Array.isArray(emp) ? emp[0] : emp;
      if (!e?.name) continue;
      const arr = teamMap.get(key) ?? [];
      arr.push({ name: e.name, role: (e.role as string) ?? "" });
      teamMap.set(key, arr);
    }
  }

  const sorted = [...liste].sort((a, b) => {
    const da = a.date as string;
    const db = b.date as string;
    if (da === heute && db !== heute) return -1;
    if (db === heute && da !== heute) return 1;
    return da.localeCompare(db);
  });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-50">Meine Einsätze</h1>
        <p className="text-sm text-zinc-500">{resolved.orgName}</p>
        <p className="mt-1 text-xs text-zinc-600">
          Eigene Einteilungen und Einsätze Ihrer Teams (laut Kalender).
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-16 text-center">
          <CalendarDays className="size-12 text-zinc-600" aria-hidden />
          <p className="font-medium text-zinc-300">Keine Einsätze geplant</p>
          <p className="text-sm text-zinc-500">
            Sobald Sie eingeteilt sind, erscheinen hier Ihre Termine.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((a) => {
            const pid = a.project_id as string | null;
            const proj = a.projects as Record<string, unknown> | Record<string, unknown>[] | null;
            const pOne = (Array.isArray(proj) ? proj[0] : proj) as {
              title?: string;
              adresse?: string | null;
              customers?: unknown;
            } | null;
            const titel =
              (pOne?.title as string) ||
              (a.project_title as string) ||
              "Einsatz";
            const cust = pOne?.customers;
            const cOne = (Array.isArray(cust) ? cust[0] : cust) as {
              address?: string | null;
              city?: string | null;
            } | null;
            const adresseAnzeige =
              (pOne?.adresse as string | null)?.trim() ||
              [cOne?.address, cOne?.city].filter(Boolean).join(", ") ||
              "";
            const d = a.date as string;
            const key = pid ? `${pid}|${d}` : "";
            const team = key ? teamMap.get(key) ?? [] : [];
            const heutig = d === heute;

            return (
              <li key={a.id as string}>
                <Link
                  href={`/m/${token}/einsatz/${a.id as string}`}
                  className={cn(
                    "touch-target block rounded-2xl border p-4 transition-colors",
                    heutig
                      ? "border-[#01696f]/50 bg-[#01696f]/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-100">{titel}</p>
                      {adresseAnzeige ? (
                        <p className="mt-1 flex items-start gap-1 text-sm text-zinc-400">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-zinc-600" />
                          <span>{adresseAnzeige}</span>
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-zinc-300">
                        {format(parseISO(d), "EEEE, dd. MMMM yyyy", { locale: de })}{" "}
                        · {(a.start_time as string).slice(0, 5)}–
                        {(a.end_time as string).slice(0, 5)} Uhr
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", statusFarbe(a.status as string))}
                    >
                      {a.status as string}
                    </Badge>
                  </div>
                  {team.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-500">Team:</span>
                      <div className="flex -space-x-2">
                        {team.slice(0, 5).map((m, i) => (
                          <span
                            key={`${m.name}-${i}`}
                            className="inline-flex size-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-zinc-300"
                            title={m.name}
                          >
                            {initialen(m.name)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
