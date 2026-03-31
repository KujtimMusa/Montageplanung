"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface OrgStat {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  mitarbeiter_gesamt: number;
  mitarbeiter_aktiv: number;
  rollen: Record<string, number>;
  einladungen_gesamt: number;
  einladungen_offen: number;
  einladungen_abgelaufen: number;
  ki_aufrufe_30d: number;
  ki_letzte_aktivitaet: string | null;
  ki_nach_typ: Record<string, number>;
  einsaetze_30d: number;
  abwesenheiten_30d: number;
  settings_vorhanden: boolean;
  health_score: number;
}

interface Gesamt {
  orgs_gesamt: number;
  orgs_diese_woche: number;
  mitarbeiter_gesamt: number;
  mitarbeiter_aktiv: number;
  einladungen_offen: number;
  einladungen_abgelaufen: number;
  ki_aufrufe_30d: number;
  einsaetze_30d: number;
  abwesenheiten_30d: number;
  orgs_mit_settings: number;
  orgs_ohne_settings: number;
}

type ApiPayload = {
  gesamt: Gesamt;
  orgs: OrgStat[];
  top_ki_orgs: Array<{ id: string; name: string; wert: number }>;
  risiko_orgs: Array<{
    id: string;
    name: string;
    health_score: number;
    ki_aufrufe_30d: number;
    mitarbeiter_aktiv: number;
    einladungen_abgelaufen: number;
  }>;
  agenten_global: Record<string, number>;
};

export default function SuperadminPage() {
  const [daten, setDaten] = useState<ApiPayload | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [ausgewaehlt, setAusgewaehlt] = useState<OrgStat | null>(null);

  async function laden() {
    setLaedt(true);
    const res = await fetch("/api/superadmin/stats");
    if (res.ok) {
      setDaten((await res.json()) as ApiPayload);
    } else {
      setDaten(null);
    }
    setLaedt(false);
  }

  useEffect(() => {
    void laden();
  }, []);

  if (laedt) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-zinc-500">
        <RefreshCw size={14} className="animate-spin" />
        Lade Daten…
      </div>
    );
  }

  if (!daten) {
    return <div className="text-sm text-red-400">Fehler beim Laden</div>;
  }

  const { gesamt, orgs, top_ki_orgs, risiko_orgs, agenten_global } = daten;

  const kiChartDaten = [...orgs]
    .sort((a, b) => b.ki_aufrufe_30d - a.ki_aufrufe_30d)
    .slice(0, 8)
    .map((o) => ({
      name: o.name.slice(0, 15),
      aufrufe: o.ki_aufrufe_30d,
      einsaetze: o.einsaetze_30d,
    }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">System-Übersicht</h1>
          <p className="mt-1 text-sm text-zinc-500">Alle Mandanten · letzte 30 Tage</p>
        </div>
        <button
          onClick={() => void laden()}
          className="flex items-center gap-2 rounded-xl border border-zinc-700/40 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400 transition-all hover:text-zinc-200"
        >
          <RefreshCw size={12} />
          Aktualisieren
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {[
          {
            label: "Betriebe",
            wert: gesamt.orgs_gesamt,
            sub: `+${gesamt.orgs_diese_woche} diese Woche`,
            icon: <Building2 size={14} />,
          },
          {
            label: "Mitarbeiter",
            wert: gesamt.mitarbeiter_gesamt,
            sub: `${gesamt.mitarbeiter_aktiv} aktiv`,
            icon: <Users size={14} />,
          },
          {
            label: "Offene Invites",
            wert: gesamt.einladungen_offen,
            sub: "warten auf Annahme",
            icon: <Mail size={14} />,
          },
          {
            label: "Invite abgelaufen",
            wert: gesamt.einladungen_abgelaufen,
            sub: "braucht Follow-up",
            icon: <AlertTriangle size={14} />,
          },
          {
            label: "KI-Aufrufe",
            wert: gesamt.ki_aufrufe_30d,
            sub: "letzte 30 Tage",
            icon: <Zap size={14} />,
          },
          {
            label: "Einsätze",
            wert: gesamt.einsaetze_30d,
            sub: "letzte 30 Tage",
            icon: <CalendarDays size={14} />,
          },
          {
            label: "Abwesenheiten",
            wert: gesamt.abwesenheiten_30d,
            sub: "letzte 30 Tage",
            icon: <Clock size={14} />,
          },
          {
            label: "Ø KI / Betrieb",
            wert:
              gesamt.orgs_gesamt > 0
                ? Math.round(gesamt.ki_aufrufe_30d / gesamt.orgs_gesamt)
                : 0,
            sub: "Aufrufe pro Betrieb",
            icon: <TrendingUp size={14} />,
          },
          {
            label: "Settings-Coverage",
            wert:
              gesamt.orgs_gesamt > 0
                ? Math.round((gesamt.orgs_mit_settings / gesamt.orgs_gesamt) * 100)
                : 0,
            sub: `${gesamt.orgs_ohne_settings} ohne app-settings`,
            icon: <CheckCircle2 size={14} />,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-4"
          >
            <div className="mb-2 text-zinc-500">{kpi.icon}</div>
            <p className="text-2xl font-bold text-zinc-100">
              {kpi.wert.toLocaleString("de-DE")}
            </p>
            <p className="mt-0.5 text-xs font-medium text-zinc-400">{kpi.label}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {kiChartDaten.length > 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
            <p className="mb-4 text-sm font-semibold text-zinc-200">
              KI-Aufrufe je Betrieb (30 Tage)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kiChartDaten} margin={{ left: -20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="aufrufe" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {kiChartDaten.length > 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
            <p className="mb-4 text-sm font-semibold text-zinc-200">
              Einsätze je Betrieb (30 Tage)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kiChartDaten} margin={{ left: -20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="einsaetze" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
          <p className="mb-4 text-sm font-semibold text-zinc-200">Betriebsrisiken (Top)</p>
          <div className="space-y-2">
            {risiko_orgs.length === 0 && (
              <p className="text-xs text-zinc-500">Keine kritischen Signale erkannt.</p>
            )}
            {risiko_orgs.map((r) => (
              <button
                key={r.id}
                onClick={() => setAusgewaehlt(orgs.find((o) => o.id === r.id) ?? null)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/40 px-3 py-2 text-left hover:border-zinc-700"
              >
                <div>
                  <p className="text-xs font-medium text-zinc-200">{r.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    KI {r.ki_aufrufe_30d} · Aktiv {r.mitarbeiter_aktiv} · Invite abgel.{" "}
                    {r.einladungen_abgelaufen}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    r.health_score < 50
                      ? "bg-red-950/30 text-red-400"
                      : "bg-amber-950/30 text-amber-400"
                  }`}
                >
                  {r.health_score}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
          <p className="mb-4 text-sm font-semibold text-zinc-200">Top KI-Mandanten</p>
          <div className="space-y-2">
            {top_ki_orgs.map((org, idx) => (
              <button
                key={org.id}
                onClick={() => setAusgewaehlt(orgs.find((o) => o.id === org.id) ?? null)}
                className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 px-3 py-2 hover:border-zinc-700"
              >
                <p className="text-xs text-zinc-300">
                  {idx + 1}. {org.name}
                </p>
                <span className="text-xs font-semibold text-violet-400">{org.wert}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
          <p className="mb-4 text-sm font-semibold text-zinc-200">Agenten-Mix global (30d)</p>
          <div className="space-y-2">
            {Object.entries(agenten_global)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([typ, count]) => (
                <div key={typ} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{typ}</span>
                  <span className="font-semibold text-zinc-200">{count}</span>
                </div>
              ))}
            {Object.keys(agenten_global).length === 0 && (
              <p className="text-xs text-zinc-500">Keine Agentenaktivität.</p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-200">Alle Betriebe</p>
          <p className="text-xs text-zinc-500">{orgs.length} Mandanten</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/40">
                {[
                  "Betrieb",
                  "Erstellt",
                  "MA",
                  "Invites",
                  "KI 30d",
                  "Einsätze 30d",
                  "Abwesenh. 30d",
                  "Health",
                  "Letzte Aktivität",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => {
                const tageInaktiv = org.ki_letzte_aktivitaet
                  ? Math.floor(
                      (Date.now() - new Date(org.ki_letzte_aktivitaet).getTime()) / 86400000
                    )
                  : null;

                return (
                  <tr
                    key={org.id}
                    onClick={() =>
                      setAusgewaehlt(ausgewaehlt?.id === org.id ? null : org)
                    }
                    className={`cursor-pointer border-b border-zinc-800/30 transition-colors last:border-0 ${
                      ausgewaehlt?.id === org.id
                        ? "bg-violet-950/20"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{org.name}</p>
                        <p className="text-[10px] text-zinc-600">{org.slug}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">
                      {new Date(org.created_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">{org.mitarbeiter_aktiv}</span>
                      <span className="text-xs text-zinc-600">/{org.mitarbeiter_gesamt}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {org.einladungen_offen > 0 && (
                          <span className="rounded-full border border-amber-900/30 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-400">
                            {org.einladungen_offen} offen
                          </span>
                        )}
                        {org.einladungen_abgelaufen > 0 && (
                          <span className="rounded-full border border-red-900/30 bg-red-950/30 px-1.5 py-0.5 text-[10px] text-red-400">
                            {org.einladungen_abgelaufen} abgel.
                          </span>
                        )}
                        {org.einladungen_offen === 0 && org.einladungen_abgelaufen === 0 && (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${
                          org.ki_aufrufe_30d > 50
                            ? "text-violet-400"
                            : org.ki_aufrufe_30d > 10
                              ? "text-zinc-300"
                              : "text-zinc-500"
                        }`}
                      >
                        {org.ki_aufrufe_30d}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{org.einsaetze_30d}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{org.abwesenheiten_30d}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          org.health_score >= 80
                            ? "bg-emerald-950/30 text-emerald-400"
                            : org.health_score >= 60
                              ? "bg-amber-950/30 text-amber-400"
                              : "bg-red-950/30 text-red-400"
                        }`}
                      >
                        {org.health_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tageInaktiv === null ? (
                        <span className="text-xs text-zinc-600">Nie</span>
                      ) : tageInaktiv === 0 ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 size={10} />
                          Heute
                        </span>
                      ) : tageInaktiv > 7 ? (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400">
                          <AlertTriangle size={10} />
                          vor {tageInaktiv}d
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <Clock size={10} />
                          vor {tageInaktiv}d
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {ausgewaehlt && (
        <div className="space-y-4 rounded-2xl border border-violet-900/30 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100">{ausgewaehlt.name}</h2>
            <button
              onClick={() => setAusgewaehlt(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Schließen
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Rollen
              </p>
              <div className="space-y-1.5">
                {Object.entries(ausgewaehlt.rollen).map(([rolle, anzahl]) => (
                  <div key={rolle} className="flex items-center justify-between">
                    <span className="text-xs capitalize text-zinc-400">{rolle}</span>
                    <span className="text-xs font-medium text-zinc-200">{anzahl}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                KI-Nutzung nach Agent
              </p>
              <div className="space-y-1.5">
                {Object.entries(ausgewaehlt.ki_nach_typ)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([typ, anzahl]) => (
                    <div key={typ} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        {typ.replace("automation_", "⚡ ")}
                      </span>
                      <span className="text-xs font-medium text-violet-400">{anzahl}×</span>
                    </div>
                  ))}
                {Object.keys(ausgewaehlt.ki_nach_typ).length === 0 && (
                  <p className="text-xs text-zinc-600">Keine KI-Nutzung</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Health</p>
              <p className="mt-1 text-xl font-bold text-zinc-100">{ausgewaehlt.health_score}</p>
            </div>
            <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Settings</p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">
                {ausgewaehlt.settings_vorhanden ? "vorhanden" : "fehlt"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Abwesenh. 30d</p>
              <p className="mt-1 text-xl font-bold text-zinc-100">
                {ausgewaehlt.abwesenheiten_30d}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Slug</p>
              <p className="mt-1 text-xs font-semibold text-zinc-300">{ausgewaehlt.slug}</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${
              ausgewaehlt.ki_aufrufe_30d > 50
                ? "border-emerald-900/30 bg-emerald-950/20 text-emerald-400"
                : ausgewaehlt.ki_aufrufe_30d > 10
                  ? "border-blue-900/30 bg-blue-950/20 text-blue-400"
                  : ausgewaehlt.ki_aufrufe_30d > 0
                    ? "border-amber-900/30 bg-amber-950/20 text-amber-400"
                    : "border-zinc-700/40 bg-zinc-800/40 text-zinc-500"
            }`}
          >
            {ausgewaehlt.ki_aufrufe_30d > 50 ? (
              <>
                <CheckCircle2 size={12} />
                Power-User — Upgrade-Gespräch sinnvoll
              </>
            ) : ausgewaehlt.ki_aufrufe_30d > 10 ? (
              <>
                <TrendingUp size={12} />
                Aktiv — läuft gut
              </>
            ) : ausgewaehlt.ki_aufrufe_30d > 0 ? (
              <>
                <AlertTriangle size={12} />
                Wenig Aktivität — Onboarding-Support prüfen
              </>
            ) : (
              <>
                <AlertTriangle size={12} />
                Keine KI-Nutzung — Churn-Risiko
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
