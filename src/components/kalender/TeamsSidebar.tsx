"use client";

import { useMemo } from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { GripVertical, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SPEZIALISIERUNGEN, type Dienstleister } from "@/types/dienstleister";
import type { AbwesenheitRow, EinsatzEvent } from "@/types/planung";

const LEGENDE: { farbe: string; label: string }[] = [
  { farbe: "bg-zinc-800", label: "Kein Einsatz" },
  { farbe: "bg-emerald-900/80", label: "Eingeplant" },
  { farbe: "bg-amber-900/60", label: "Abwesenheit" },
  { farbe: "bg-orange-900/60", label: "Konflikt" },
];

const WOCHE_TAGS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
const MAX_TAGE_AUSLASTUNG = 5;

export type TeamSidebarEintrag = {
  id: string;
  name: string;
  farbe: string;
  abteilung: string | null;
  mitglieder: { id: string; name: string }[];
};

function teamHatKonflikt(
  teamId: string,
  datum: string,
  membersByTeam: Map<string, Set<string>>,
  abwesenheiten: AbwesenheitRow[]
): boolean {
  const members = membersByTeam.get(teamId);
  if (!members || members.size === 0) return false;
  for (const empId of Array.from(members)) {
    for (const a of abwesenheiten) {
      if (
        a.employee_id === empId &&
        datum >= a.start_date &&
        datum <= a.end_date
      ) {
        return true;
      }
    }
  }
  return false;
}

function naechsterFreierTagLabel(
  teamId: string,
  zuweisungen: EinsatzEvent[]
): string {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = addDays(heute, i);
    const iso = format(d, "yyyy-MM-dd");
    const hat = zuweisungen.some(
      (z) => z.team_id === teamId && z.date === iso
    );
    if (!hat) {
      return format(d, "EEE d. MMMM", { locale: de });
    }
  }
  return "—";
}

type Props = {
  teams: TeamSidebarEintrag[];
  dienstleister: Dienstleister[];
  einsaetzeProTeamZeitraum: Record<string, number>;
  heuteEinsaetze: number;
  heuteAbwesenheiten: number;
  zuweisungen: EinsatzEvent[];
  abwesenheiten: AbwesenheitRow[];
  /** Inklusiver Kalenderzeitraum (yyyy-MM-dd) für Auslastung & Filter */
  sichtbarVon: string;
  sichtbarBis: string;
};

export function TeamsSidebar({
  teams,
  dienstleister,
  einsaetzeProTeamZeitraum,
  heuteEinsaetze,
  heuteAbwesenheiten,
  zuweisungen,
  abwesenheiten,
  sichtbarVon,
  sichtbarBis,
}: Props) {
  const dienstleisterAktiv = dienstleister.filter(
    (d) => d.status === "aktiv" || d.status === "partner"
  );

  const membersByTeam = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const t of teams) {
      m.set(t.id, new Set(t.mitglieder.map((x) => x.id)));
    }
    return m;
  }, [teams]);

  const vonIso = sichtbarVon;
  const bisIso = sichtbarBis;
  /** Montag der Woche, die den sichtbaren Zeitraum beginnt (Mo–So-Kapseln) */
  const wocheStart = startOfWeek(parseISO(sichtbarVon), { weekStartsOn: 1 });

  return (
    <TooltipProvider>
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <Tabs defaultValue="teams" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-zinc-800/60">
          <div className="flex h-10 items-center px-4 pt-2">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Ressourcen
            </h2>
          </div>
          <div className="px-2 pb-2">
            <TabsList className="grid h-9 w-full grid-cols-2 gap-1 bg-zinc-900/90 p-1">
              <TabsTrigger
                value="teams"
                className="gap-1.5 px-2 py-1.5 text-[10px] font-semibold data-[state=active]:bg-zinc-800"
              >
                <Users className="size-3 opacity-70" aria-hidden />
                Teams
                <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                  {teams.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="partner"
                className="gap-1 px-2 py-1.5 text-[10px] font-semibold data-[state=active]:bg-zinc-800"
              >
                Partner
                <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
                  {dienstleisterAktiv.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent
          value="teams"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="min-h-0 flex-1">
            <div id="teams-drag-sidebar" className="pb-2 pr-1 pt-2">
              {teams.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-zinc-500">
                  Noch keine Teams angelegt.
                </p>
              ) : (
                teams.map((team) => {
                  const einsaetzeDieseWoche = zuweisungen.filter(
                    (z) =>
                      z.team_id === team.id &&
                      z.date >= vonIso &&
                      z.date <= bisIso
                  ).length;
                  const auslastung = Math.min(
                    einsaetzeDieseWoche / MAX_TAGE_AUSLASTUNG,
                    1
                  );
                  const balkenBreite = Math.min(Math.round(auslastung * 100), 100);
                  const balkenFarbe =
                    auslastung > 0.8
                      ? "#ef4444"
                      : auslastung > 0.5
                        ? "#f59e0b"
                        : team.farbe;
                  const freiLabel = naechsterFreierTagLabel(team.id, zuweisungen);

                  return (
                    <div
                      key={team.id}
                      draggable
                      onDragStart={(e) => {
                        const payload = JSON.stringify({
                          type: "team",
                          teamId: team.id,
                          teamName: team.name,
                          teamFarbe: team.farbe,
                        });
                        e.dataTransfer.setData("application/team", payload);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      style={{
                        background: "#141414",
                        border: "1px solid #1e1e1e",
                        borderRadius: "10px",
                        padding: "12px",
                        marginBottom: "8px",
                        marginLeft: "8px",
                        marginRight: "8px",
                        cursor: "grab",
                      }}
                      className="group select-none transition-colors hover:border-zinc-600 active:cursor-grabbing"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: team.farbe,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#e4e4e7",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {team.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: "#52525b",
                            flexShrink: 0,
                          }}
                        >
                          {einsaetzeDieseWoche}/{MAX_TAGE_AUSLASTUNG} Tage
                        </span>
                      </div>

                      {team.abteilung ? (
                        <p className="mt-0.5 pl-6 text-[10px] text-zinc-600">
                          {team.abteilung}
                        </p>
                      ) : null}

                      <div
                        style={{
                          margin: "8px 0 6px",
                          height: 3,
                          background: "#27272a",
                          borderRadius: 99,
                        }}
                      >
                        <div
                          style={{
                            width: `${balkenBreite}%`,
                            height: "100%",
                            background: balkenFarbe,
                            borderRadius: 99,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>

                      <div className="mb-2 flex w-full gap-1">
                        {WOCHE_TAGS.map((tag, i) => {
                          const day = addDays(wocheStart, i);
                          const iso = format(day, "yyyy-MM-dd");
                          const dow = day.getDay();
                          const istWochenende = dow === 0 || dow === 6;
                          const tagEinsaetze = zuweisungen.filter(
                            (z) => z.team_id === team.id && z.date === iso
                          ).length;
                          const hatKonflikt = teamHatKonflikt(
                            team.id,
                            iso,
                            membersByTeam,
                            abwesenheiten
                          );
                          const zelleKlasse = cn(
                            "h-4 w-full rounded-sm border transition-colors",
                            hatKonflikt && "border-amber-500 bg-amber-500/25",
                            !hatKonflikt &&
                              tagEinsaetze === 0 &&
                              (istWochenende ? "border-zinc-700 bg-zinc-800/80" : "border-zinc-800 bg-zinc-900"),
                            !hatKonflikt &&
                              tagEinsaetze >= 2 &&
                              "border-red-500/80 bg-red-500/70",
                            !hatKonflikt &&
                              tagEinsaetze === 1 &&
                              "border-transparent"
                          );
                          return (
                            <Tooltip key={tag}>
                              <TooltipTrigger className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center">
                                <div
                                  className={zelleKlasse}
                                  style={
                                    !hatKonflikt && tagEinsaetze === 1
                                      ? {
                                          background: `${team.farbe}80`,
                                          borderColor: `${team.farbe}99`,
                                        }
                                      : undefined
                                  }
                                />
                                <span className="text-[9px] text-zinc-600">{tag}</span>
                              </TooltipTrigger>
                              <TooltipContent className="border-zinc-700 bg-zinc-900 text-xs">
                                {tag}:{" "}
                                {tagEinsaetze === 0
                                  ? "Frei"
                                  : `${tagEinsaetze} Einsatz${tagEinsaetze > 1 ? "e" : ""}`}
                                {hatKonflikt ? " · Abwesenheit im Team" : ""}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-1.5 pl-0.5">
                        <div className="flex -space-x-1">
                        {team.mitglieder.slice(0, 3).map((m) => (
                          <div
                            key={m.id}
                            title={m.name}
                            className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 text-[8px] font-bold text-white"
                            style={{ backgroundColor: `${team.farbe}80` }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {team.mitglieder.length > 3 ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 bg-zinc-700 text-[8px] text-zinc-400">
                            +{team.mitglieder.length - 3}
                          </div>
                        ) : null}
                        </div>
                        <span className="text-xs text-zinc-600">
                          {team.mitglieder.length} Mitglieder
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 10,
                          color: "#52525b",
                          marginTop: 6,
                        }}
                      >
                        Frei ab: {freiLabel}
                      </p>

                      <p className="mt-2 text-[10px] text-zinc-700 transition-colors group-hover:text-zinc-500">
                        ↳ Auf Projekt + Tag ziehen
                      </p>

                      <p className="mt-0.5 text-[9px] text-zinc-600">
                        Sichtbarer Zeitraum:{" "}
                        <span className="tabular-nums text-zinc-500">
                          {einsaetzeProTeamZeitraum[team.id] ?? 0}
                        </span>{" "}
                        Einsätze
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="partner"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <ScrollArea className="min-h-0 flex-1">
            <div id="dienstleister-drag-container" className="pb-3 pr-1 pt-2">
              {dienstleisterAktiv.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-zinc-500">
                  Keine aktiven Partner. Unter Dienstleister anlegen.
                </p>
              ) : (
                dienstleisterAktiv.map((d) => {
                  const dataEvent = JSON.stringify({
                    title: d.firma,
                    color: "transparent",
                    extendedProps: {
                      dienstleisterId: d.id,
                      typ: "dienstleister",
                      spezialisierung: d.spezialisierung,
                    },
                  });
                  return (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", dataEvent);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      className="draggable-dienstleister mx-2 mb-2 cursor-grab select-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-all hover:border-zinc-600 active:cursor-grabbing"
                      data-event={dataEvent}
                    >
                      <p className="text-xs font-semibold text-zinc-200">{d.firma}</p>
                      {d.ansprechpartner ? (
                        <p className="text-[10px] text-zinc-500">{d.ansprechpartner}</p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {d.spezialisierung.slice(0, 2).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500"
                          >
                            {SPEZIALISIERUNGEN.find((x) => x.value === s)?.label}
                          </span>
                        ))}
                      </div>
                      {d.vorlauf_tage > 0 ? (
                        <p className="mt-1 text-[9px] text-zinc-700">
                          {d.vorlauf_tage}T Vorlauf
                        </p>
                      ) : null}
                      <p className="mt-1 flex items-center gap-0.5 text-[9px] text-zinc-700">
                        <GripVertical size={8} /> Auf Projekt-Tag ziehen
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-zinc-800/60 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
          Legende
        </p>
        <div className="space-y-1">
          {LEGENDE.map((e) => (
            <div key={e.label} className="flex items-center gap-2">
              <div className={cn("h-2 w-3 shrink-0 rounded-sm", e.farbe)} />
              <span className="text-[10px] text-zinc-600">{e.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-800/60 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase text-zinc-500">
          Heute
        </p>
        <p className="text-[10px] text-zinc-400">
          {heuteEinsaetze} Einsätze aktiv
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          {heuteAbwesenheiten} Mitarbeiter abwesend
        </p>
      </div>
    </div>
    </TooltipProvider>
  );
}
