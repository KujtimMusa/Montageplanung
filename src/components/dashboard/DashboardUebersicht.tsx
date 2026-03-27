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
  Bot,
  Calendar,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

      <Card
        className={cn(
          "overflow-hidden border-violet-500/35 bg-gradient-to-br from-violet-950/50 via-zinc-900 to-indigo-950/40 text-zinc-100 shadow-none"
        )}
      >
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
              <Bot className="size-6 text-violet-300" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-zinc-50">
                KI-Assistent, Agenten & Bot
              </p>
              <p className="text-sm text-zinc-400">
                Chat mit Zugriff auf Planung, dedizierte Agenten und
                Automatisierungen — direkt aus der Montageplanung.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/ki"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "gap-2 bg-violet-600 text-white hover:bg-violet-500"
                )}
              >
                <MessageSquare className="size-4" aria-hidden />
                Zum Chat
              </Link>
              <Link
                href="/ki?tab=agenten"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-violet-500/40 bg-zinc-950/50 text-zinc-100 hover:bg-zinc-900"
                )}
              >
                <Bot className="size-4" aria-hidden />
                Agenten
              </Link>
              <Link
                href="/ki?tab=automatisierungen"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-violet-500/40 bg-zinc-950/50 text-zinc-100 hover:bg-zinc-900"
                )}
              >
                <Zap className="size-4 text-amber-300" aria-hidden />
                Automationen
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <p className="max-w-sm text-xs text-zinc-600">
                  Gezählt werden Einsätze der laufenden Kalenderwoche; die Abteilung
                  kommt vom zugewiesenen Mitarbeiter. Ohne Zuordnung oder außerhalb
                  der Woche bleibt das Diagramm leer.
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
                <p className="max-w-[220px] text-xs text-zinc-600">
                  Hier erscheinen nur Termine mit Datum <strong className="font-medium text-zinc-500">heute</strong>.
                </p>
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
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 p-4 text-center">
                <p className="text-sm text-zinc-500">
                  Noch keine Einsätze im Zeitraum.
                </p>
                <p className="max-w-md text-xs text-zinc-600">
                  Die letzten 7 Tage werden aus allen gespeicherten Einsätzen
                  aggregiert. Liegen keine Buchungen vor, bleibt die Kurve bei null.
                </p>
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
              href="/ki"
              className={cn(
                buttonVariants({ variant: "secondary", size: "default" }),
                "h-12 w-full justify-between border border-violet-500/35 bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-sm hover:from-violet-500 hover:to-indigo-500"
              )}
            >
              <span className="flex items-center gap-2">
                <Bot className="size-4" />
                KI-Assistent
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
        <Alert className="border-amber-500/40 bg-amber-950/25 text-amber-50 [&_[svg]]:text-amber-400">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Wetterwarnungen</AlertTitle>
          <AlertDescription className="text-amber-100/85">
            <span className="tabular-nums">{daten.wetterWarnungen}</span>{" "}
            unbestätigte Meldung(en) — bitte in der{" "}
            <Link href="/planung" className="font-medium underline underline-offset-2 hover:text-white">
              Planung
            </Link>{" "}
            prüfen und bestätigen.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
