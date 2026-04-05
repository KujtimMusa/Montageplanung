import Link from "next/link";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { Zap } from "lucide-react";

export default async function PwaAktivPage({
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

  const { data: offen } = await supabase
    .from("time_entries")
    .select("id, checkin_at, assignment_id, project_id")
    .eq("employee_id", resolved.employeeId)
    .is("checkout_at", null)
    .order("checkin_at", { ascending: false })
    .limit(5);

  const assignmentIds = Array.from(
    new Set((offen ?? []).map((o) => o.assignment_id).filter(Boolean))
  ) as string[];
  const titelNachAssignment: Record<string, string> = {};
  if (assignmentIds.length > 0) {
    const { data: asn } = await supabase
      .from("assignments")
      .select("id, project_title, projects(title)")
      .in("id", assignmentIds);
    for (const row of asn ?? []) {
      const pr = row.projects as { title?: string } | { title?: string }[] | null;
      const p = Array.isArray(pr) ? pr[0] : pr;
      titelNachAssignment[row.id as string] =
        (p?.title as string) || (row.project_title as string) || "Einsatz";
    }
  }

  const heute = format(new Date(), "yyyy-MM-dd");
  const { data: heuteEinsaetze } = await supabase
    .from("assignments")
    .select("id,date,start_time,end_time,status,projects(title)")
    .eq("employee_id", resolved.employeeId)
    .eq("organization_id", resolved.orgId)
    .eq("date", heute)
    .order("start_time", { ascending: true });

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-50">
          <Zap className="size-6 text-[#01696f]" />
          Aktiv
        </h1>
        <p className="text-sm text-zinc-500">Zeiterfassung & heute</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Eingestempelt</h2>
        {!offen || offen.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
            Sie sind nicht eingestempelt.
          </p>
        ) : (
          <ul className="space-y-3">
            {offen.map((e) => {
              const aid = e.assignment_id as string | null;
              const titel = aid ? titelNachAssignment[aid] ?? "Einsatz" : "Einsatz";
              return (
                <li
                  key={e.id as string}
                  className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3"
                >
                  <p className="font-medium text-emerald-200">{titel}</p>
                  <p className="text-xs text-zinc-500">
                    seit{" "}
                    {format(parseISO(e.checkin_at as string), "HH:mm", {
                      locale: de,
                    })}{" "}
                    Uhr
                  </p>
                  {aid ? (
                    <Link
                      href={`/m/${token}/einsatz/${aid}`}
                      className="mt-2 inline-block text-sm font-medium text-[#01696f]"
                    >
                      Zum Einsatz →
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Heute geplant</h2>
        {!heuteEinsaetze || heuteEinsaetze.length === 0 ? (
          <p className="text-sm text-zinc-500">Keine Einsätze für heute.</p>
        ) : (
          <ul className="space-y-2">
            {heuteEinsaetze.map((x) => {
              const pr = x.projects as { title?: string } | { title?: string }[] | null;
              const p = Array.isArray(pr) ? pr[0] : pr;
              return (
                <li key={x.id as string}>
                  <Link
                    href={`/m/${token}/einsatz/${x.id as string}`}
                    className="block rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                  >
                    <p className="font-medium text-zinc-100">
                      {p?.title ?? "Einsatz"}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {(x.start_time as string).slice(0, 5)}–
                      {(x.end_time as string).slice(0, 5)} · {x.status as string}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
