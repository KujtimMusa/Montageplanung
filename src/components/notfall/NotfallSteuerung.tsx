"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Search,
  UserX,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  NotfallErsatzVorschlag,
  NotfallSteuerungProps,
} from "@/components/notfall/types";

function projektLabel(e: NotfallSteuerungProps["einsätze"][0]): string {
  if (e.projects?.title) return e.projects.title;
  if (e.project_title?.trim()) return e.project_title.trim();
  return "Einsatz";
}

function projektFarbe(e: NotfallSteuerungProps["einsätze"][0]): string {
  const f = e.projects?.farbe?.trim();
  if (f) return f;
  return "#3b82f6";
}

function vorschlaegeFuerEinsatz(
  e: NotfallSteuerungProps["einsätze"][0],
  ki: NotfallSteuerungProps["kiErsatz"][string] | undefined,
  kandidaten: { id: string; name: string }[]
): NotfallErsatzVorschlag[] {
  const seen = new Set<string>();
  const out: NotfallErsatzVorschlag[] = [];
  if (ki) {
    out.push({
      id: ki.employeeId,
      name: ki.name,
      kiGrund: ki.grund || "KI-Empfehlung",
      score: 92,
      quelle: "ki",
    });
    seen.add(ki.employeeId);
  }
  let score = 85;
  for (const k of kandidaten) {
    if (seen.has(k.id)) continue;
    out.push({
      id: k.id,
      name: k.name,
      kiGrund: "Gleiche Abteilung · Zeitfenster frei",
      score: Math.max(58, score),
      quelle: "pool",
    });
    score -= 8;
    if (out.length >= 5) break;
  }
  return out;
}

function effektivErsatzId(
  einsatzId: string,
  manuell: Record<string, string>,
  ki: NotfallSteuerungProps["kiErsatz"]
): string | undefined {
  const m = manuell[einsatzId];
  if (m) return m;
  return ki[einsatzId]?.employeeId;
}

export function NotfallSteuerung({
  mitarbeiter,
  ausfallId,
  setAusfallId,
  datum,
  setDatum,
  aktiverSchritt,
  setAktiverSchritt,
  betroffeneGeladen,
  kiLaed,
  onNotfallAnalysieren,
  einsätze,
  kandidatenProEinsatz,
  kiErsatz,
  manuellerErsatz,
  ersatzManuellSetzen,
  onAlleErsatzBestaetigen,
  onResetNotfall,
  lädt,
}: NotfallSteuerungProps) {
  const ausfall = useMemo(
    () => mitarbeiter.find((m) => m.id === ausfallId),
    [mitarbeiter, ausfallId]
  );

  const heuteIso = useMemo(
    () => new Date().toISOString().slice(0, 10),
    []
  );

  const schritte = useMemo(
    () => [
      { nr: 1, label: "Wer fällt aus?", icon: UserX },
      { nr: 2, label: "Ersatz suchen", icon: Search },
      { nr: 3, label: "Ersatz bestätigen", icon: CheckCircle2 },
    ],
    []
  );

  function geheZuSchritt(nr: number) {
    if (nr === 1) {
      setAktiverSchritt(1);
      return;
    }
    if (nr === 2) {
      if (!ausfallId || !betroffeneGeladen) return;
      setAktiverSchritt(2);
      return;
    }
    if (nr === 3) {
      if (einsätze.length === 0) return;
      setAktiverSchritt(3);
    }
  }

  const alleEinsaetzeMitErsatz =
    einsätze.length > 0 &&
    einsätze.every((e) => effektivErsatzId(e.id, manuellerErsatz, kiErsatz));

  const vorschlaegeProEinsatz = useMemo(() => {
    const m: Record<string, NotfallErsatzVorschlag[]> = {};
    for (const e of einsätze) {
      m[e.id] = vorschlaegeFuerEinsatz(
        e,
        kiErsatz[e.id],
        kandidatenProEinsatz[e.id] ?? []
      );
    }
    return m;
  }, [einsätze, kiErsatz, kandidatenProEinsatz]);

  if (aktiverSchritt === 4) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900 py-12">
        <div className="flex size-14 items-center justify-center rounded-full border border-emerald-800/60 bg-emerald-950/60">
          <CheckCircle2 size={28} className="text-emerald-400" />
        </div>
        <p className="text-base font-bold text-zinc-200">Notfall gelöst</p>
        <p className="text-xs text-zinc-600">
          Die Einsätze wurden in der Planung aktualisiert.
        </p>
        <button
          type="button"
          onClick={onResetNotfall}
          className="mt-2 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Neuen Notfall anlegen
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 text-zinc-100">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <div className="size-1.5 animate-pulse rounded-full bg-red-500" />
            <h1 className="text-2xl font-bold text-zinc-100">Notfallplan</h1>
          </div>
          <p className="text-xs text-zinc-600">
            Kurzfristiger Ausfall — KI findet sofort Ersatz
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5">
          <div
            className={cn(
              "size-1.5 rounded-full",
              kiLaed ? "animate-pulse bg-amber-500" : "animate-pulse bg-emerald-500"
            )}
          />
          <span className="text-xs font-semibold text-zinc-400">
            {kiLaed ? "KI analysiert…" : "KI bereit"}
          </span>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-zinc-800/60 bg-zinc-900 p-4">
        <div className="flex items-center">
          {schritte.map((s, i) => {
            const Icon = s.icon;
            const erreichbar =
              s.nr === 1 ||
              (s.nr === 2 && !!ausfallId && betroffeneGeladen) ||
              (s.nr === 3 && einsätze.length > 0);
            return (
              <span className="contents" key={s.nr}>
                <button
                  type="button"
                  disabled={!erreichbar}
                  onClick={() => geheZuSchritt(s.nr)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 transition-all",
                    aktiverSchritt === s.nr
                      ? "bg-zinc-800 text-zinc-100"
                      : aktiverSchritt > s.nr
                        ? "cursor-pointer text-emerald-400 hover:bg-zinc-800/50"
                        : "cursor-not-allowed text-zinc-600"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                      aktiverSchritt === s.nr
                        ? "bg-zinc-100 text-zinc-900"
                        : aktiverSchritt > s.nr
                          ? "border border-emerald-800 bg-emerald-950 text-emerald-400"
                          : "bg-zinc-800 text-zinc-600"
                    )}
                  >
                    {aktiverSchritt > s.nr ? (
                      <Check size={11} strokeWidth={3} />
                    ) : (
                      s.nr
                    )}
                  </div>
                  <span className="hidden text-sm font-semibold sm:inline">
                    {s.label}
                  </span>
                  <Icon className="size-4 shrink-0 sm:hidden" aria-hidden />
                </button>
                {i < schritte.length - 1 ? (
                  <div
                    className={cn(
                      "mx-2 h-px min-w-[12px] flex-1 transition-all",
                      aktiverSchritt > s.nr ? "bg-emerald-900" : "bg-zinc-800"
                    )}
                  />
                ) : null}
              </span>
            );
          })}
        </div>
      </div>

      {aktiverSchritt === 1 ? (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">
            Ausgefallener Mitarbeiter
          </h3>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Mitarbeiter
              </label>
              <select
                value={ausfallId}
                onChange={(e) => setAusfallId(e.target.value)}
                className="h-[42px] w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 transition-colors hover:border-zinc-600 focus:border-zinc-600 focus:outline-none"
              >
                <option value="">Mitarbeiter wählen…</option>
                {mitarbeiter.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.abteilung ? ` (${m.abteilung})` : ""}
                  </option>
                ))}
              </select>
              {mitarbeiter.length === 0 ? (
                <p className="mt-2 text-xs text-amber-500">
                  Keine Mitarbeiter geladen — bitte Stammdaten prüfen oder Seite neu
                  laden.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                Ab wann?
              </label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                className="h-[42px] w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 transition-colors [color-scheme:dark] focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {ausfall && betroffeneGeladen ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 text-sm font-bold text-zinc-300">
                {ausfall.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-200">
                  {ausfall.name}
                </p>
                <p className="text-xs text-zinc-600">
                  {ausfall.abteilung ?? "—"} · {einsätze.length} offene Einsätze
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-red-900/50 bg-red-950/60 px-2.5 py-1">
                <span className="text-xs font-bold text-red-400">
                  {einsätze.length} betroffen
                </span>
              </div>
            </div>
          ) : null}

          {!ausfall?.department_id && ausfallId ? (
            <p className="mb-3 text-sm text-amber-400">
              Keine Abteilung hinterlegt — Ersatzfilter ist eingeschränkt.
            </p>
          ) : null}

          <button
            type="button"
            onClick={onNotfallAnalysieren}
            disabled={!ausfallId || kiLaed || lädt}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
              ausfallId && !kiLaed && !lädt
                ? "bg-red-600 text-white hover:bg-red-500"
                : "cursor-not-allowed bg-zinc-800 text-zinc-600"
            )}
          >
            {kiLaed || lädt ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                KI analysiert…
              </>
            ) : (
              <>
                <Zap size={15} />
                Notfall analysieren
              </>
            )}
          </button>
        </div>
      ) : null}

      {aktiverSchritt === 2 ? (
        <div className="space-y-3">
          {einsätze.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 text-sm text-zinc-500">
              Keine Einsätze an diesem Tag. Zurück zu Schritt 1.
            </p>
          ) : (
            einsätze.map((einsatz) => {
              const vorschlaege = vorschlaegeProEinsatz[einsatz.id] ?? [];
              const gewaehlt = effektivErsatzId(
                einsatz.id,
                manuellerErsatz,
                kiErsatz
              );
              const dringlich =
                einsatz.date === heuteIso ? "hoch" : "normal";

              return (
                <div
                  key={einsatz.id}
                  className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-0.5 flex items-center gap-2">
                        <div
                          className="size-1.5 shrink-0 rounded-full"
                          style={{
                            background: projektFarbe(einsatz),
                          }}
                        />
                        <p className="text-sm font-bold text-zinc-200">
                          {projektLabel(einsatz)}
                        </p>
                      </div>
                      <div className="ml-3.5 flex flex-wrap items-center gap-3">
                        <span className="text-xs tabular-nums text-zinc-600">
                          {format(new Date(einsatz.date), "EEE, dd.MM.", {
                            locale: de,
                          })}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {einsatz.start_time.slice(0, 5)}–
                          {einsatz.end_time.slice(0, 5)}
                        </span>
                        {einsatz.teamName ? (
                          <span className="text-xs text-zinc-600">
                            {einsatz.teamName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        dringlich === "hoch"
                          ? "border-red-900/50 bg-red-950/60 text-red-400"
                          : "border-amber-900/50 bg-amber-950/60 text-amber-400"
                      )}
                    >
                      {dringlich === "hoch" ? "Dringend" : "Normal"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                      KI-Ersatzvorschläge
                    </p>
                    {vorschlaege.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-xl border border-zinc-800/60 bg-zinc-800/30 p-2">
                        <Select
                          value={gewaehlt ?? "__none__"}
                          onValueChange={(v) =>
                            ersatzManuellSetzen(
                              einsatz.id,
                              v === "__none__" ? null : v
                            )
                          }
                        >
                          <SelectTrigger className="h-9 border-zinc-700 bg-zinc-800 text-xs">
                            <SelectValue placeholder="Ersatz wählen…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" disabled>
                              Ersatz wählen…
                            </SelectItem>
                            {(kandidatenProEinsatz[einsatz.id] ?? []).map(
                              (emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      vorschlaege.map((v, i) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            ersatzManuellSetzen(einsatz.id, v.id)
                          }
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all",
                            gewaehlt === v.id
                              ? "border-emerald-700/60 bg-emerald-950/30"
                              : "border-zinc-800/60 bg-zinc-800/30 hover:border-zinc-700"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              i === 0
                                ? "border border-emerald-800 bg-emerald-950 text-emerald-400"
                                : "border border-zinc-700 bg-zinc-800 text-zinc-600"
                            )}
                          >
                            {i + 1}
                          </div>
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 text-xs font-bold text-zinc-300">
                            {v.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-zinc-200">
                              {v.name}
                            </p>
                            <p className="truncate text-xs text-zinc-600">
                              {v.kiGrund}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className="text-sm font-bold tabular-nums"
                              style={{
                                color:
                                  v.score > 80 ? "#10b981" : "#f59e0b",
                              }}
                            >
                              {v.score}%
                            </p>
                            <p className="text-[9px] text-zinc-700">Match</p>
                          </div>
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                              gewaehlt === v.id
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-zinc-700"
                            )}
                          >
                            {gewaehlt === v.id ? (
                              <Check size={9} className="text-white" />
                            ) : null}
                          </div>
                        </button>
                      ))
                    )}

                    {vorschlaege.length > 0 ? (() => {
                      const extraKandidaten = (
                        kandidatenProEinsatz[einsatz.id] ?? []
                      ).filter(
                        (k) => !vorschlaege.some((v) => v.id === k.id)
                      );
                      if (extraKandidaten.length === 0) return null;
                      const poolVal =
                        gewaehlt &&
                        extraKandidaten.some((k) => k.id === gewaehlt)
                          ? gewaehlt
                          : "__use_cards__";
                      return (
                        <div className="pt-1">
                          <Select
                            value={poolVal}
                            onValueChange={(v) =>
                              ersatzManuellSetzen(
                                einsatz.id,
                                v === "__use_cards__" ? null : v
                              )
                            }
                          >
                            <SelectTrigger className="h-8 border-zinc-700 bg-zinc-900 text-[11px] text-zinc-400">
                              <span className="flex items-center gap-1">
                                <ChevronDown size={12} /> Weitere aus Pool
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__use_cards__">
                                Top-Vorschlagsliste nutzen
                              </SelectItem>
                              {extraKandidaten.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })() : null}
                  </div>
                </div>
              );
            })
          )}

          {einsätze.length > 0 ? (
            <button
              type="button"
              disabled={!alleEinsaetzeMitErsatz}
              onClick={() => geheZuSchritt(3)}
              className={cn(
                "mt-2 w-full rounded-xl py-2.5 text-sm font-semibold transition-all",
                alleEinsaetzeMitErsatz
                  ? "bg-zinc-100 text-zinc-900 hover:bg-white"
                  : "cursor-not-allowed bg-zinc-800 text-zinc-600"
              )}
            >
              Weiter zur Bestätigung
            </button>
          ) : null}
        </div>
      ) : null}

      {aktiverSchritt === 3 ? (
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200">
            Zusammenfassung
          </h3>

          <div className="mb-5 space-y-2">
            {einsätze.map((einsatz) => {
              const maId = effektivErsatzId(
                einsatz.id,
                manuellerErsatz,
                kiErsatz
              );
              const ma = mitarbeiter.find((m) => m.id === maId);
              if (!maId || !ma) return null;
              return (
                <div
                  key={einsatz.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 py-2.5 pr-2 pl-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: projektFarbe(einsatz) }}
                    />
                    <span className="truncate text-xs font-semibold text-zinc-300">
                      {projektLabel(einsatz)}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-600">
                      {format(new Date(einsatz.date), "dd.MM.", { locale: de })}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ArrowRight size={12} className="text-zinc-700" />
                    <div className="flex size-5 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-400">
                      {ma.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] truncate text-xs font-semibold text-zinc-300 sm:max-w-[160px]">
                      {ma.name}
                    </span>
                  </div>
                  <div className="flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-800 bg-emerald-950">
                    <Check size={9} className="text-emerald-400" />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onAlleErsatzBestaetigen}
            disabled={!alleEinsaetzeMitErsatz || lädt || kiLaed}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
              alleEinsaetzeMitErsatz && !lädt && !kiLaed
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "cursor-not-allowed bg-zinc-800 text-zinc-600"
            )}
          >
            {lädt ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Wird gespeichert…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {einsätze.length} Ersatz bestätigen
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
