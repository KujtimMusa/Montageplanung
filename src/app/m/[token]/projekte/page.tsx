"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

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

type ProjektePayload = {
  orgName: string;
  heute: string;
  token: string;
  rows: Zeile[];
  teamMap: Record<string, { name: string; role: string }[]>;
};

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

export default function PwaProjektePage() {
  const params = useParams();
  const router = useRouter();
  const tokenRaw = params?.token;
  const token =
    typeof tokenRaw === "string"
      ? tokenRaw
      : Array.isArray(tokenRaw)
        ? tokenRaw[0] ?? ""
        : "";

  const [gateChecked, setGateChecked] = useState(false);
  const [data, setData] = useState<ProjektePayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setGateChecked(true);
      return;
    }
    const onboardingKey = `pwa_onboarding_done_${token.slice(0, 8)}`;
    try {
      if (!localStorage.getItem(onboardingKey)) {
        router.replace(`/m/${token}`);
        return;
      }
    } catch {
      router.replace(`/m/${token}`);
      return;
    }
    setGateChecked(true);
  }, [token, router]);

  useEffect(() => {
    if (!gateChecked || !token) return;
    let cancelled = false;
    void (async () => {
      try {
        const u = new URL("/api/pwa/monteur-projekte", window.location.origin);
        u.searchParams.set("token", token);
        const res = await fetch(u.toString(), { cache: "no-store" });
        const j = (await res.json()) as ProjektePayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setLoadErr(j.error ?? "Fehler");
          return;
        }
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setLoadErr("Einsätze konnten nicht geladen werden.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gateChecked, token]);

  if (!gateChecked || !token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-zinc-500" aria-hidden />
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="p-4 text-sm text-red-400">{loadErr}</div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-zinc-500" aria-hidden />
      </div>
    );
  }

  const { orgName, heute, rows: sorted, teamMap: teamMapRaw, token: t } = data;
  const teamMap = new Map(Object.entries(teamMapRaw));

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-50">Meine Einsätze</h1>
        <p className="text-sm text-zinc-500">{orgName}</p>
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
            const proj = a.projects as
              | Record<string, unknown>
              | Record<string, unknown>[]
              | null;
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
                  href={`/m/${t}/einsatz/${a.id as string}`}
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
