"use client";

import Link from "next/link";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Bot,
  Calendar,
  TrendingDown,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type {
  DashboardDaten,
  NaechsterEinsatz,
  TeamHeuteZeile,
} from "@/lib/data/dashboard";

function trendProzent(heute: number, gesternMax: number): number {
  if (gesternMax === 0) return heute > 0 ? 100 : 0;
  return Math.round(((heute - gesternMax) / gesternMax) * 100);
}

function StatKarte(props: {
  wert: number;
  label: string;
  subtext: string;
  farbe: string;
  Icon: typeof Calendar;
  trend: number;
  trendUmgekehrt?: boolean;
}) {
  const { wert, label, subtext, farbe, Icon, trend, trendUmgekehrt } = props;
  const gut = trendUmgekehrt ? trend < 0 : trend > 0;
  const schlecht = trendUmgekehrt ? trend > 0 : trend < 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5",
        "transition-all hover:border-zinc-700/60"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-xl p-2" style={{ background: `${farbe}15` }}>
          <Icon size={18} style={{ color: farbe }} aria-hidden />
        </div>
        {trend !== 0 ? (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              gut
                ? "bg-emerald-950 text-emerald-400"
                : schlecht
                  ? "bg-red-950 text-red-400"
                  : "bg-zinc-800 text-zinc-400"
            )}
          >
            {trend > 0 ? (
              <TrendingUp size={10} aria-hidden />
            ) : (
              <TrendingDown size={10} aria-hidden />
            )}
            {Math.abs(trend)}%
          </div>
        ) : null}
      </div>
      <div>
        <p className="mb-1 text-3xl font-bold tabular-nums text-zinc-100">
          {wert}
        </p>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-700">{subtext}</p>
      </div>
    </div>
  );
}

type ChartTooltipEintrag = {
  value?: number;
  color?: string;
  name?: string;
};

function payloadAlsListe(
  raw: unknown
): ChartTooltipEintrag[] {
  if (!Array.isArray(raw)) return [];
  return raw as ChartTooltipEintrag[];
}

function AbteilungTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipEintrag[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm shadow-2xl">
      <p className="mb-2 font-semibold text-zinc-200">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-zinc-400">Einsätze:</span>
          <span className="font-semibold text-zinc-200">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function AuslastungTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipEintrag[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm shadow-2xl">
      <p className="mb-2 font-semibold text-zinc-200">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{ background: p.color ?? "#6366f1" }}
          />
          <span className="text-zinc-400">Einsätze:</span>
          <span className="font-semibold text-zinc-200">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function EinsatzZeile({ einsatz }: { einsatz: NaechsterEinsatz }) {
  const pfar =
    einsatz.projektFarbe?.trim() ||
    einsatz.teamFarbe?.trim() ||
    "#3b82f6";
  const statusAnzeige = (einsatz.projektStatus ?? einsatz.status ?? "geplant")
    .toString()
    .toLowerCase();

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-2 py-3",
        "border-b border-zinc-800/40 last:border-0",
        "transition-colors hover:bg-zinc-800/20"
      )}
    >
      <div className="min-w-[52px] shrink-0 text-right">
        <p className="text-xs font-bold tabular-nums text-zinc-300">
          {einsatz.start}
        </p>
        <p className="text-xs tabular-nums text-zinc-600">{einsatz.ende}</p>
      </div>
      <div className="flex flex-col items-center gap-1 pt-1">
        <div
          className="size-2 rounded-full"
          style={{ background: pfar }}
        />
        <div className="min-h-[20px] w-px flex-1 bg-zinc-800" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="truncate text-sm font-semibold text-zinc-200">
          {einsatz.projekt}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {einsatz.mitarbeiter}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {einsatz.teamName ? (
            <div className="flex items-center gap-1">
              <div
                className="size-1.5 rounded-full"
                style={{
                  background: einsatz.teamFarbe ?? "#52525b",
                }}
              />
              <span className="text-xs text-zinc-500">{einsatz.teamName}</span>
            </div>
          ) : null}
          {einsatz.projektAdresse ? (
            <span className="truncate text-xs text-zinc-600">
              · {einsatz.projektAdresse}
            </span>
          ) : null}
        </div>
        <div className="mt-1.5">
          <span
            className={cn(
              "rounded-md border border-zinc-700/80 px-1.5 py-0.5 text-[10px] font-semibold",
              "bg-zinc-800/80 text-zinc-300"
            )}
          >
            {statusAnzeige}
          </span>
        </div>
      </div>
    </div>
  );
}

function TeamZeile({ team }: { team: TeamHeuteZeile }) {
  const echtHeute = team.heuteEinsaetze;
  const istAktiv = echtHeute.length > 0;
  const erste = echtHeute[0];

  return (
    <div
      className={cn(
        "group flex cursor-default items-center gap-3 rounded-lg px-2 py-3",
        "border-b border-zinc-800/40 last:border-0",
        "transition-colors hover:bg-zinc-800/30"
      )}
    >
      <div
        className={cn(
          "size-2 shrink-0 rounded-full",
          istAktiv ? "animate-pulse" : ""
        )}
        style={{
          background: istAktiv ? team.farbe : "#3f3f46",
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-300">
            {team.name}
          </span>
          <span className="text-xs text-zinc-600">
            {team.mitglieder.length} MA
          </span>
        </div>
        {istAktiv && erste ? (
          <p className="truncate text-xs text-zinc-500">
            {erste.projektTitel ?? "Einsatz"}
            {erste.start_time
              ? ` · ${erste.start_time}–${erste.end_time}`
              : null}
          </p>
        ) : (
          <p className="text-xs text-zinc-700">Heute frei</p>
        )}
      </div>
      <div
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold",
          istAktiv
            ? "border border-emerald-900/50 bg-emerald-950 text-emerald-400"
            : "bg-zinc-800/50 text-zinc-600"
        )}
      >
        {istAktiv ? `${echtHeute.length}×` : "Frei"}
      </div>
      <div
        className={cn(
          "flex -space-x-1.5 opacity-0 transition-opacity",
          "group-hover:opacity-100"
        )}
      >
        {team.mitglieder.slice(0, 3).map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex size-6 items-center justify-center rounded-full border-2 border-zinc-900",
              "bg-zinc-700 text-[9px] font-bold text-zinc-400"
            )}
            title={m.name}
          >
            {m.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardUebersicht({ daten }: { daten: DashboardDaten }) {
  const hatBalken = daten.balkenAbteilungen.some((b) => b.einsaetze > 0);
  const hatArea = daten.auslastung7Tage.some((a) => a.einsaetze > 0);

  const trendEinsaetze = trendProzent(
    daten.einsaetzeHeute,
    daten.einsaetzeGestern
  );
  const trendVerfuegbar = trendProzent(
    daten.mitarbeiterVerfuegbar,
    daten.mitarbeiterGesternVerfuegbar
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatKarte
          wert={daten.einsaetzeHeute}
          label="Einsätze heute"
          subtext="Gebuchte Termine für heute"
          farbe="#3b82f6"
          Icon={Calendar}
          trend={trendEinsaetze}
        />
        <StatKarte
          wert={daten.mitarbeiterVerfuegbar}
          label="Mitarbeiter frei"
          subtext="Aktiv und heute nicht abwesend"
          farbe="#10b981"
          Icon={Users}
          trend={trendVerfuegbar}
          trendUmgekehrt
        />
        <StatKarte
          wert={daten.offeneKonflikte}
          label="Offene Konflikte"
          subtext="Überschneidungen je Mitarbeiter und Tag"
          farbe="#f59e0b"
          Icon={AlertTriangle}
          trend={0}
        />
        <StatKarte
          wert={daten.abwesendHeute}
          label="Abwesend heute"
          subtext="Meldungen mit heutigem Abwesenheitstag"
          farbe="#ef4444"
          Icon={UserX}
          trend={0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Einsätze pro Abteilung
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              Summe in der laufenden Kalenderwoche (Abteilung des Mitarbeiters)
            </p>
          </div>
          <div className="h-[280px] pt-2">
            {!hatBalken ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
                <Calendar className="size-10 text-zinc-600" aria-hidden />
                <p className="text-sm text-zinc-500">
                  Noch keine Einsätze in dieser Woche.
                </p>
                <Link
                  href="/planung"
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                >
                  Zur Planung
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={daten.balkenAbteilungen}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <AbteilungTooltip
                        active={props.active}
                        payload={payloadAlsListe(props.payload)}
                        label={props.label as string}
                      />
                    )}
                  />
                  <Bar dataKey="einsaetze" radius={[6, 6, 0, 0]} fill="#3b82f6">
                    {daten.balkenAbteilungen.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color ?? "#3b82f6"}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Nächste Einsätze heute
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600">Sortiert nach Startzeit</p>
          </div>
          {daten.naechsteEinsaetze.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-700 py-8 text-center">
              <p className="text-sm text-zinc-500">Heute keine Einsätze.</p>
              <Link
                href="/planung"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-zinc-700"
                )}
              >
                Planung öffnen
              </Link>
            </div>
          ) : (
            <ul className="max-h-[min(340px,55vh)] overflow-y-auto">
              {daten.naechsteEinsaetze.map((e) => (
                <li key={e.id}>
                  <EinsatzZeile einsatz={e} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Auslastung letzte 7 Tage
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              Anzahl Einsätze pro Kalendertag (Europe/Berlin)
            </p>
          </div>
          <div className="h-[240px] pt-2">
            {!hatArea ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 p-4 text-center">
                <p className="text-sm text-zinc-500">
                  Noch keine Einsätze im Zeitraum.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={daten.auslastung7Tage}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="auslastungGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#6366f1"
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="100%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <AuslastungTooltip
                        active={props.active}
                        payload={payloadAlsListe(props.payload)}
                        label={
                          typeof props.label === "string"
                            ? props.label
                            : String(props.label ?? "")
                        }
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="einsaetze"
                    fill="url(#auslastungGradient)"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="einsaetze"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: "#6366f1", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#818cf8" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Teams heute</h3>
              <p className="mt-0.5 text-xs text-zinc-600">
                Einsatzstatus aller Teams
              </p>
            </div>
            <Link
              href="/planung"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Planung →
            </Link>
          </div>
          <div className="max-h-[min(340px,55vh)] overflow-y-auto">
            {daten.teamsHeute.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Keine Teams im aktuellen Kontext.
              </p>
            ) : (
              daten.teamsHeute.map((t) => <TeamZeile key={t.id} team={t} />)
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 rounded-2xl border border-zinc-800/40 bg-zinc-900/50 p-4",
          "sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-violet-900/30 bg-violet-950/50 p-2">
            <Bot size={16} className="text-violet-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-300">KI-Assistent</p>
            <p className="text-xs text-zinc-600">
              Planung analysieren, Konflikte erkennen, Empfehlungen erhalten
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/ki?tab=agenten"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            )}
          >
            Agenten
          </Link>
          <Link
            href="/ki"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-violet-600 text-xs font-semibold text-white hover:bg-violet-500"
            )}
          >
            Chat öffnen
          </Link>
        </div>
      </div>

      {daten.wetterWarnungen > 0 && (
        <Alert className="border-amber-500/40 bg-amber-950/25 text-amber-50 [&_[svg]]:text-amber-400">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Wetterwarnungen</AlertTitle>
          <AlertDescription className="text-amber-100/85">
            <span className="tabular-nums">{daten.wetterWarnungen}</span>{" "}
            unbestätigte Meldung(en) — bitte in der{" "}
            <Link
              href="/planung"
              className="font-medium underline underline-offset-2 hover:text-white"
            >
              Planung
            </Link>{" "}
            prüfen und bestätigen.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
