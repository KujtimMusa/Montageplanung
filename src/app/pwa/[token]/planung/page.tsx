import Link from "next/link";
import { format, addDays, subDays, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export default async function KoordinatorPlanungPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (!istGueltigeTokenZeichenfolge(token)) return null;

  const resolved = await resolveToken(token);
  if (!resolved || resolved.role !== "coordinator") return null;

  const tag =
    sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d)
      ? sp.d
      : format(new Date(), "yyyy-MM-dd");

  const supabase = createServiceRoleClient();
  const { data: rows } = await supabase
    .from("assignments")
    .select(
      "id,date,start_time,end_time,status,notes, employees(name), projects(title, adresse)"
    )
    .eq("organization_id", resolved.orgId)
    .eq("date", tag)
    .order("start_time", { ascending: true })
    .limit(80);

  const vorher = format(subDays(parseISO(tag), 1), "yyyy-MM-dd");
  const nachher = format(addDays(parseISO(tag), 1), "yyyy-MM-dd");

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-zinc-50">Planung</h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/pwa/${token}/planung?d=${vorher}`}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
        >
          ← Gestern
        </Link>
        <span className="text-sm font-medium text-zinc-200">
          {format(parseISO(tag), "EEE d. MMM", { locale: de })}
        </span>
        <Link
          href={`/pwa/${token}/planung?d=${nachher}`}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
        >
          Morgen →
        </Link>
      </div>
      <Link
        href={`/pwa/${token}/planung`}
        className="inline-block text-xs text-[#01696f]"
      >
        Heute
      </Link>

      {(rows ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">Keine Einsätze an diesem Tag.</p>
      ) : (
        <ul className="space-y-2">
          {(rows ?? []).map((a) => {
            const emp = a.employees as { name?: string } | { name?: string }[] | null;
            const name = Array.isArray(emp) ? emp[0]?.name : emp?.name;
            const pr = a.projects as { title?: string; adresse?: string | null } | null;
            const titel = Array.isArray(pr) ? pr[0]?.title : pr?.title;
            const adr = Array.isArray(pr) ? pr[0]?.adresse : pr?.adresse;
            return (
              <li
                key={a.id as string}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-sm"
              >
                <p className="font-semibold text-zinc-100">
                  {(a.start_time as string).slice(0, 5)}–
                  {(a.end_time as string).slice(0, 5)}
                </p>
                <p className="text-zinc-200">{titel ?? "Projekt"}</p>
                <p className="text-zinc-500">{name ?? "—"}</p>
                {adr ? <p className="mt-1 text-xs text-zinc-600">{adr}</p> : null}
                <p className="mt-1 text-xs text-zinc-600">{a.status as string}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
