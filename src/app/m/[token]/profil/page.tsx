import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { PwaProfilActions } from "@/components/pwa/PwaProfilActions";
import { rolleLabel } from "@/lib/rollen";

export default async function PwaProfilPage({
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
  const jetzt = new Date();
  const woStart = startOfWeek(jetzt, { weekStartsOn: 1 });
  const woEnde = endOfWeek(jetzt, { weekStartsOn: 1 });

  const { data: entries } = await supabase
    .from("time_entries")
    .select("checkin_at, checkout_at")
    .eq("employee_id", resolved.employeeId)
    .gte("checkin_at", woStart.toISOString())
    .lte("checkin_at", woEnde.toISOString())
    .not("checkout_at", "is", null);

  let minutenWoche = 0;
  for (const e of entries ?? []) {
    const ci = parseISO(e.checkin_at as string);
    const co = parseISO(e.checkout_at as string);
    minutenWoche += Math.max(
      0,
      Math.round((co.getTime() - ci.getTime()) / 60000)
    );
  }

  const grenze = format(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );
  const { data: kommend } = await supabase
    .from("assignments")
    .select("id,date,start_time,projects(title)")
    .eq("employee_id", resolved.employeeId)
    .eq("organization_id", resolved.orgId)
    .gte("date", format(jetzt, "yyyy-MM-dd"))
    .lte("date", grenze)
    .order("date", { ascending: true })
    .limit(10);

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-50">{resolved.employeeName}</h1>
        <p className="text-sm text-zinc-500">{rolleLabel(resolved.employeeRole)}</p>
        <p className="mt-1 text-xs text-zinc-600">{resolved.orgName}</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs font-medium uppercase text-zinc-500">Diese Woche</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
          {Math.floor(minutenWoche / 60)} Std. {minutenWoche % 60} Min.
        </p>
        <p className="text-xs text-zinc-500">Erfasste Arbeitszeit (Stempel)</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-400">Nächste Einsätze (7 Tage)</p>
        <ul className="space-y-2">
          {(kommend ?? []).length === 0 ? (
            <li className="text-sm text-zinc-500">Keine geplant.</li>
          ) : (
            (kommend ?? []).map((a) => {
              const pr = a.projects as { title?: string } | { title?: string }[] | null;
              const p = Array.isArray(pr) ? pr[0] : pr;
              const d = a.date as string;
              return (
                <li
                  key={a.id as string}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-300">{p?.title ?? "Einsatz"}</span>
                  <span className="text-zinc-500">
                    {format(parseISO(d), "EEE dd.MM.", { locale: de })}{" "}
                    {(a.start_time as string).slice(0, 5)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <PwaProfilActions
        token={token}
        vapidKonfiguriert={Boolean(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
        )}
      />
    </div>
  );
}
