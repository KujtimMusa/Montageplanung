"use client";

import Link from "next/link";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
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
  MapPin,
  UserX,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type {
  DashboardDaten,
  MitarbeiterHeuteZeile,
  NaechsterEinsatz,
  WochenTeamInfo,
} from "@/lib/data/dashboard";

function initialen2(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function StatKarte({
  wert,
  label,
  subtext,
  Icon,
}: {
  wert: number;
  label: string;
  subtext: string;
  Icon: typeof Calendar;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5",
        "transition-all hover:border-zinc-700/60"
      )}
    >
      <div className="mb-5 flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <Icon size={16} className="text-zinc-600" aria-hidden />
      </div>
      <p className="mb-1 text-4xl font-bold tabular-nums text-zinc-100">
        {wert}
      </p>
      <p className="text-xs text-zinc-600">{subtext}</p>
    </div>
  );
}

type PayloadEintrag = {
  value?: number;
  color?: string;
  name?: string;
  dataKey?: string | number;
  fill?: string;
};

function payloadListe(raw: unknown): PayloadEintrag[] {
  if (!Array.isArray(raw)) return [];
  return raw as PayloadEintrag[];
}

function WochenTooltip({
  active,
  payload,
  label,
  teamsById,
}: {
  active?: boolean;
  payload?: PayloadEintrag[];
  label?: string;
  teamsById: Map<string, WochenTeamInfo>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm shadow-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      {payload.map((p, i) => {
        const keyStr = String(p.dataKey ?? "");
        const teamName = teamsById.get(keyStr)?.name ?? keyStr;
        const n = Number(p.value ?? 0);
        return (
          <div
            key={i}
            className="flex items-center justify-between gap-4 py-0.5"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="size-2 rounded-full"
                style={{ background: p.fill ?? p.color }}
              />
              <span className="text-xs text-zinc-400">{teamName}</span>
            </div>
            <span className="text-xs font-bold text-zinc-200">
              {n} Einsatz{n !== 1 ? "e" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AuslastungTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: PayloadEintrag[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const wert = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-indigo-500" />
        <span className="text-xs text-zinc-400">Einsätze gesamt:</span>
        <span className="text-sm font-bold text-zinc-200">{wert}</span>
      </div>
    </div>
  );
}

function EinsatzZeile({ einsatz }: { einsatz: NaechsterEinsatz }) {
  const startAnzeige = einsatz.start || "–";

  return (
    <div className="flex items-start gap-4 border-b border-zinc-800/40 py-3.5 last:border-0">
      <div className="w-14 shrink-0 pt-0.5">
        <p className="text-sm font-bold leading-tight text-zinc-200 tabular-nums">
          {startAnzeige}
        </p>
        <p className="text-xs text-zinc-600 tabular-nums">{einsatz.ende}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-zinc-200">
          {einsatz.projekt}
        </p>
        {einsatz.projektAdresse ? (
          <div className="mt-0.5 flex items-center gap-1">
            <MapPin size={10} className="shrink-0 text-zinc-600" aria-hidden />
            <p className="truncate text-xs text-zinc-600">
              {einsatz.projektAdresse}
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex -space-x-1.5">
          {einsatz.teamMitglieder.slice(0, 3).map((tm) => (
            <div
              key={tm.id}
              className={cn(
                "flex size-6 items-center justify-center rounded-full border-2 border-zinc-900",
                "bg-zinc-700 text-[9px] font-bold text-zinc-400"
              )}
              title={tm.name}
            >
              {initialen2(tm.name)}
            </div>
          ))}
        </div>
        {einsatz.teamName && einsatz.teamFarbe ? (
          <div
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
            style={{
              borderColor: `${einsatz.teamFarbe}50`,
              color: einsatz.teamFarbe,
              background: `${einsatz.teamFarbe}10`,
            }}
          >
            <div
              className="size-1.5 rounded-full"
              style={{ background: einsatz.teamFarbe }}
            />
            {einsatz.teamName}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MitarbeiterHeuteZeileKomponente({ ma }: { ma: MitarbeiterHeuteZeile }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2.5",
        "transition-colors hover:bg-zinc-800/30"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
          "text-xs font-bold"
        )}
        style={{
          background: `${ma.farbe}20`,
          borderColor: `${ma.farbe}60`,
          color: ma.farbe,
        }}
        aria-hidden
      >
        {initialen2(ma.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-zinc-300">
            {ma.name}
          </p>
          {ma.typ === "koordinator" ? (
            <Badge className="h-5 shrink-0 px-1.5 text-[10px]">Koordinator</Badge>
          ) : (
            <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
              Mitarbeiter
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-600">{ma.untertitel}</p>
      </div>
      <div
        className={cn(
          "flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
          ma.istImEinsatz
            ? "border-emerald-900/50 bg-emerald-950/60 text-emerald-400"
            : "border-zinc-700/30 bg-zinc-800/40 text-zinc-600"
        )}
      >
        {ma.istImEinsatz ? "● Aktiv" : "○ Frei"}
      </div>
    </div>
  );
}

export function DashboardUebersicht({ daten }: { daten: DashboardDaten }) {
  const teamsById = new Map(
    daten.wochenTeams.map((t) => [t.id, t] as const)
  );
  const hatWochenAnsicht = daten.wochenTeams.length > 0;
  const hatWochenDaten = daten.wochenChart.some((row) =>
    daten.wochenTeams.some((t) => Number(row[t.id] ?? 0) > 0)
  );
  const hatArea = daten.auslastung7Tage.some((a) => a.einsaetze > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatKarte
          wert={daten.einsaetzeHeute}
          label="Einsätze heute"
          subtext="Gebuchte Einsätze für heute"
          Icon={Calendar}
        />
        <StatKarte
          wert={daten.mitarbeiterVerfuegbar}
          label="Mitarbeiter frei"
          subtext="Aktiv und heute nicht abwesend"
          Icon={Users}
        />
        <StatKarte
          wert={daten.offeneKonflikte}
          label="Offene Konflikte"
          subtext="Überschneidungen je Mitarbeiter/Tag"
          Icon={AlertTriangle}
        />
        <StatKarte
          wert={daten.abwesendHeute}
          label="Abwesend heute"
          subtext="Meldungen mit heutigem Abwesenheitstag"
          Icon={UserX}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 lg:col-span-3">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Wochenübersicht
              </h3>
              <p className="mt-0.5 text-xs text-zinc-600">
                Einsätze pro Tag und Team
              </p>
            </div>
            {daten.wochenTeams.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {daten.wochenTeams.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <div
                      className="size-2 rounded-full"
                      style={{ background: t.farbe }}
                    />
                    <span className="text-xs text-zinc-500">{t.name}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="h-[280px] pt-2">
            {!hatWochenAnsicht ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
                <Calendar className="size-10 text-zinc-600" aria-hidden />
                <p className="text-sm text-zinc-500">
                  Keine Teams im aktuellen Kontext.
                </p>
                <Link
                  href="/planung"
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                >
                  Zur Planung
                </Link>
              </div>
            ) : !hatWochenDaten ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
                <p className="text-sm text-zinc-500">
                  Noch keine teambezogenen Einsätze in dieser Woche.
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
                  data={daten.wochenChart}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barGap={2}
                  barSize={12}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="tag"
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <WochenTooltip
                        active={props.active}
                        payload={payloadListe(props.payload)}
                        label={props.label as string}
                        teamsById={teamsById}
                      />
                    )}
                  />
                  {daten.wochenTeams.map((t) => (
                    <Bar
                      key={t.id}
                      dataKey={t.id}
                      fill={t.farbe}
                      radius={[4, 4, 0, 0]}
                      fillOpacity={0.85}
                    />
                  ))}
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
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <p className="text-sm font-medium text-zinc-500">
                Keine Einsätze heute
              </p>
              <p className="text-xs text-zinc-700">Alle Mitarbeiter sind verfügbar</p>
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
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
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
                        payload={payloadListe(props.payload)}
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
                    isAnimationActive={false}
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
              <h3 className="text-sm font-semibold text-zinc-200">
                Mitarbeiter heute
              </h3>
              <p className="mt-0.5 text-xs text-zinc-600">
                Einsatzstatus aller Mitarbeiter
              </p>
            </div>
            <Link
              href="/teams"
              className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Alle →
            </Link>
          </div>
          <div className="max-h-[min(340px,55vh)] space-y-1 overflow-y-auto">
            {daten.mitarbeiterHeute.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Keine Mitarbeiter im aktuellen Kontext.
              </p>
            ) : (
              daten.mitarbeiterHeute.map((ma) => (
                <MitarbeiterHeuteZeileKomponente key={ma.id} ma={ma} />
              ))
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
          <Bot size={18} className="shrink-0 text-violet-400" aria-hidden />
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
