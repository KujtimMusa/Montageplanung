"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserMinus,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DashboardDaten } from "@/lib/data/dashboard";

const cardClass =
  "border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none";

function TrendPfeil({
  heute,
  gestern,
  umgekehrt,
}: {
  heute: number;
  gestern: number;
  /** z. B. bei Verfügbarkeit: höher ist besser */
  umgekehrt?: boolean;
}) {
  if (gestern === heute) {
    return (
      <span className="flex items-center gap-1 text-xs text-zinc-500">
        <span className="inline-block size-1.5 rounded-full bg-zinc-500" />
        gleich wie gestern
      </span>
    );
  }
  const up = heute > gestern;
  const gut = umgekehrt ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        gut ? "text-emerald-400" : "text-amber-400"
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {gestern === 0 ? "neu" : `${heute > gestern ? "+" : ""}${heute - gestern}`}
    </span>
  );
}

export function DashboardUebersicht({ daten }: { daten: DashboardDaten }) {
  const chartAkzent = "#6366f1";

  const hatBalken = daten.balkenAbteilungen.some((b) => b.einsaetze > 0);
  const hatArea = daten.auslastung7Tage.some((a) => a.einsaetze > 0);

  return (
    <div className="space-y-8">
      {/* Obere Reihe: 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardDescription className="text-zinc-400">Einsätze heute</CardDescription>
            <Calendar className="size-4 text-indigo-400" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-white">
              {daten.einsaetzeHeute}
            </div>
            <TrendPfeil
              heute={daten.einsaetzeHeute}
              gestern={daten.einsaetzeGestern}
            />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardDescription className="text-zinc-400">
              Mitarbeiter verfügbar
            </CardDescription>
            <Users className="size-4 text-indigo-400" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-white">
              {daten.mitarbeiterVerfuegbar}
            </div>
            <TrendPfeil
              heute={daten.mitarbeiterVerfuegbar}
              gestern={daten.mitarbeiterGesternVerfuegbar}
              umgekehrt
            />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardDescription className="text-zinc-400">Offene Konflikte</CardDescription>
            <AlertTriangle
              className={cn(
                "size-4",
                daten.offeneKonflikte > 0 ? "text-amber-400" : "text-zinc-600"
              )}
              aria-hidden
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-white">
              {daten.offeneKonflikte}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Überschneidungen je Mitarbeiter/Tag
            </p>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardDescription className="text-zinc-400">Abwesend heute</CardDescription>
            <UserMinus className="size-4 text-indigo-400" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-white">
              {daten.abwesendHeute}
            </div>
            <Link
              href="/einstellungen?tab=abwesenheiten"
              className="mt-1 inline-block text-xs font-medium text-indigo-400 hover:underline"
            >
              Abwesenheiten
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Mittlere Reihe */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={cn(cardClass, "lg:col-span-2")}>
          <CardHeader>
            <CardTitle className="text-lg text-zinc-50">
              Einsätze pro Abteilung (diese Woche)
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Summe gebuchter Einsätze nach Abteilung des Mitarbeiters
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            {!hatBalken ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
                <Calendar className="size-10 text-zinc-600" />
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
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#52525b" }}
                  />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#52525b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fafafa" }}
                  />
                  <Bar
                    dataKey="einsaetze"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  >
                    {daten.balkenAbteilungen.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg text-zinc-50">
              Nächste Einsätze heute
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Sortiert nach Startzeit
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <ul className="space-y-3">
                {daten.naechsteEinsaetze.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-100">
                          {e.mitarbeiter}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{e.projekt}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 border-zinc-700 bg-zinc-800 text-zinc-200"
                      >
                        {e.start}–{e.ende}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className="mt-2 border-zinc-600 text-[10px] text-zinc-400"
                    >
                      {e.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Untere Reihe */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={cn(cardClass, "lg:col-span-2")}>
          <CardHeader>
            <CardTitle className="text-lg text-zinc-50">
              Auslastung (letzte 7 Tage)
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Anzahl Einsätze pro Tag
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] pt-2">
            {!hatArea ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-500">
                Noch keine Einsätze im Zeitraum.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={daten.auslastung7Tage}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillAuslastung" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartAkzent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={chartAkzent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#52525b" }}
                  />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#52525b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="einsaetze"
                    stroke={chartAkzent}
                    fill="url(#fillAuslastung)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg text-zinc-50">Schnellzugriff</CardTitle>
            <CardDescription className="text-zinc-500">
              Häufige Aktionen
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href="/planung"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "h-12 w-full justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
              )}
            >
              <span className="flex items-center gap-2">
                <Calendar className="size-4" />
                Neuer Einsatz
              </span>
              <ArrowRight className="size-4 opacity-80" />
            </Link>
            <Link
              href="/notfall"
              className={cn(
                buttonVariants({ variant: "secondary", size: "default" }),
                "h-12 w-full justify-between border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              )}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                Notfall melden
              </span>
              <ArrowRight className="size-4 opacity-60" />
            </Link>
            {daten.darfMitarbeiterEinladen ? (
              <Link
                href="/teams"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "h-12 w-full justify-between border-zinc-600 text-zinc-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-indigo-400" />
                  Mitarbeiter einladen
                </span>
                <ArrowRight className="size-4 opacity-60" />
              </Link>
            ) : (
              <p className="rounded-md border border-dashed border-zinc-700 px-3 py-2 text-center text-xs text-zinc-500">
                Nur Admins/Abteilungsleiter können Mitarbeiter einladen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {daten.wetterWarnungen > 0 && (
        <p className="text-center text-sm text-amber-400">
          {daten.wetterWarnungen} aktive Wetterwarnung(en) — bitte in der Planung
          prüfen.
        </p>
      )}
    </div>
  );
}
