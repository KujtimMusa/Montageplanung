import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  istGueltigeTokenZeichenfolge,
  resolveToken,
} from "@/lib/pwa/token-resolver";
import { ZeiterfassungWidget } from "@/components/pwa/ZeiterfassungWidget";
import { EinsatzBaudoku } from "@/components/pwa/EinsatzBaudoku";
import { ArrowLeft, ExternalLink, Phone } from "lucide-react";

export default async function PwaEinsatzDetailPage({
  params,
}: {
  params: Promise<{ token: string; assignmentId: string }>;
}) {
  const { token, assignmentId } = await params;
  if (!istGueltigeTokenZeichenfolge(token)) {
    notFound();
  }
  const resolved = await resolveToken(token);
  if (!resolved || resolved.role === "customer") {
    notFound();
  }

  const supabase = createServiceRoleClient();
  const { data: a, error } = await supabase
    .from("assignments")
    .select(
      `id,employee_id,organization_id,date,start_time,end_time,status,notes,
       project_id, project_title,
       projects(id,title,adresse,notes,customer_id,
         customers(company_name,phone,address,city))`
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (error || !a) {
    notFound();
  }

  if (
    (a.employee_id as string | null) !== resolved.employeeId ||
    (a.organization_id as string) !== resolved.orgId
  ) {
    notFound();
  }

  const pid = a.project_id as string | null;
  const proj = a.projects as Record<string, unknown> | Record<string, unknown>[] | null;
  const pOneRaw = Array.isArray(proj) ? proj[0] : proj;
  const pOne = pOneRaw as {
    title?: string;
    adresse?: string | null;
    notes?: string | null;
    customers?: unknown;
  } | null;
  const titel =
    (pOne?.title as string) || (a.project_title as string) || "Einsatz";
  const cust = pOne?.customers;
  const cOne = Array.isArray(cust) ? cust[0] : cust;
  const adresse =
    (pOne?.adresse as string | null)?.trim() ||
    [cOne?.address, cOne?.city].filter(Boolean).join(", ") ||
    "";
  const mapsUrl = adresse
    ? `https://www.google.com/maps?q=${encodeURIComponent(adresse)}`
    : null;

  const d = a.date as string;
  const wetterDatum = format(parseISO(d), "yyyy-MM-dd");
  const { data: wetter } = pid
    ? await supabase
        .from("weather_alerts")
        .select("id,condition,severity,alert_date")
        .eq("project_id", pid)
        .eq("alert_date", wetterDatum)
        .limit(3)
    : { data: [] };

  const { data: teamRows } = await supabase
    .from("assignments")
    .select("employees(name,role)")
    .eq("project_id", pid)
    .eq("date", d)
    .neq("employee_id", resolved.employeeId);

  const teamListe: { name: string; role: string }[] = [];
  for (const row of teamRows ?? []) {
    const emp = row.employees as
      | { name?: string; role?: string }
      | { name?: string; role?: string }[]
      | null;
    const e = Array.isArray(emp) ? emp[0] : emp;
    if (e?.name) teamListe.push({ name: e.name, role: e.role ?? "" });
  }

  return (
    <div className="space-y-6 p-4">
      <Link
        href={`/m/${token}/projekte`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="size-4" />
        Zurück
      </Link>

      <div>
        <h1 className="text-xl font-bold leading-tight text-zinc-50">{titel}</h1>
        {adresse ? (
          <div className="mt-2 flex flex-wrap items-start gap-2">
            <p className="text-sm text-zinc-400">{adresse}</p>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#01696f]"
              >
                In Maps öffnen <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}
        <p className="mt-3 text-sm text-zinc-300">
          {format(parseISO(d), "EEEE, dd. MMMM yyyy", { locale: de })} ·{" "}
          {(a.start_time as string).slice(0, 5)}–{(a.end_time as string).slice(0, 5)}{" "}
          Uhr
        </p>
      </div>

      {cOne?.company_name ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-xs text-zinc-500">Kunde</p>
          <p className="font-medium text-zinc-100">{cOne.company_name}</p>
          {cOne.phone ? (
            <a
              href={`tel:${cOne.phone}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-blue-400"
            >
              <Phone className="size-3.5" />
              {cOne.phone}
            </a>
          ) : null}
        </div>
      ) : null}

      {teamListe.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Team</p>
          <ul className="space-y-1 text-sm text-zinc-300">
            {teamListe.map((t, i) => (
              <li key={i}>
                {t.name}
                {t.role ? (
                  <span className="text-zinc-500"> · {t.role}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(a.notes as string | null)?.trim() || (pOne?.notes as string | null)?.trim() ? (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3">
          <p className="text-xs font-medium text-amber-200/80">Hinweis</p>
          <p className="mt-1 text-sm text-zinc-200">
            {(a.notes as string | null)?.trim() ||
              (pOne?.notes as string | null)?.trim()}
          </p>
        </div>
      ) : null}

      {wetter && wetter.length > 0 ? (
        <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-3">
          <p className="text-xs font-medium text-sky-300">Wetter</p>
          {wetter.map((w, i) => (
            <p key={(w as { id?: string }).id ?? i} className="mt-1 text-sm text-zinc-200">
              {(w.condition as string) ?? ""} ({(w.severity as string) ?? ""})
            </p>
          ))}
        </div>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">Zeiterfassung</h2>
        <ZeiterfassungWidget
          token={token}
          assignmentId={assignmentId}
          projectId={pid}
        />
      </section>

      {pid ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-400">Baudokumentation</h2>
          <EinsatzBaudoku
            token={token}
            projectId={pid}
            assignmentId={assignmentId}
          />
        </section>
      ) : null}
    </div>
  );
}
