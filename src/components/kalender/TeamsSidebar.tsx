"use client";

import { GripVertical, Users, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SPEZIALISIERUNGEN, type Dienstleister } from "@/types/dienstleister";

export type TeamSidebarEintrag = {
  id: string;
  name: string;
  farbe: string;
  abteilung: string | null;
  mitglieder: { id: string; name: string }[];
};

type Props = {
  teams: TeamSidebarEintrag[];
  dienstleister: Dienstleister[];
  einsaetzeProTeamZeitraum: Record<string, number>;
  heuteEinsaetze: number;
  heuteAbwesenheiten: number;
};

export function TeamsSidebar({
  teams,
  dienstleister,
  einsaetzeProTeamZeitraum,
  heuteEinsaetze,
  heuteAbwesenheiten,
}: Props) {
  const dienstleisterAktiv = dienstleister.filter(
    (d) => d.status === "aktiv" || d.status === "partner"
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="shrink-0 border-b border-zinc-800 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Rechte Leiste
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">
          <span className="text-zinc-200">Team</span> oder{" "}
          <span className="text-zinc-200">Partner</span> auf den{" "}
          <span className="text-zinc-200">Tag</span> ziehen — nachdem die Projektzeile
          im Kalender gewählt ist.
        </p>
      </div>

      <Tabs defaultValue="teams" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-2 mt-2 w-[calc(100%-16px)] shrink-0 bg-zinc-900/80">
          <TabsTrigger value="teams" className="flex-1 gap-1 text-xs">
            <Users className="size-3 opacity-70" aria-hidden />
            Teams
            <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
              {teams.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="partner" className="flex-1 text-xs">
            Partner
            <Badge variant="secondary" className="h-4 px-1 text-[9px] tabular-nums">
              {dienstleisterAktiv.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

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
                teams.map((team) => (
                  <div
                    key={team.id}
                    draggable
                    onDragStart={(e) => {
                      const payload = JSON.stringify({
                        title: team.name,
                        extendedProps: { teamId: team.id },
                      });
                      e.dataTransfer.setData("application/json", payload);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="draggable-team mx-2 my-1 cursor-grab select-none rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 active:cursor-grabbing"
                    data-event={JSON.stringify({
                      title: team.name,
                      extendedProps: { teamId: team.id },
                    })}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: team.farbe }}
                      />
                      <span className="text-xs font-medium text-zinc-200">
                        {team.name}
                      </span>
                    </div>

                    {team.abteilung ? (
                      <p className="mt-0.5 pl-5 text-[10px] text-zinc-600">
                        {team.abteilung}
                      </p>
                    ) : null}

                    <div className="mt-2 flex -space-x-1 pl-5">
                      {team.mitglieder.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          title={m.name}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 text-[8px] font-bold text-white"
                          style={{ backgroundColor: `${team.farbe}80` }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {team.mitglieder.length > 4 ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-950 bg-zinc-700 text-[8px] text-zinc-400">
                          +{team.mitglieder.length - 4}
                        </div>
                      ) : null}
                    </div>

                    <p className="mt-1.5 pl-5 text-[10px] text-zinc-600">
                      {einsaetzeProTeamZeitraum[team.id] ?? 0} Einsätze in diesem
                      Zeitraum
                    </p>
                    <p className="mt-1 flex items-center gap-1 pl-5 text-[9px] text-zinc-700">
                      <GripVertical size={9} />
                      Auf Projekt-Tag ziehen
                    </p>
                  </div>
                ))
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

      <Separator className="my-2 shrink-0 bg-zinc-800" />

      <div className="shrink-0 px-3 pb-3">
        <p className="mb-2 text-[10px] font-semibold uppercase text-zinc-500">
          Legende
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-500/20 border-l-2 border-red-400" />
            <span className="text-[10px] text-zinc-500">Abwesenheit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border border-orange-400 bg-orange-500/20" />
            <span className="text-[10px] text-zinc-500">Konflikt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border-l-2 border-blue-500 bg-blue-500/10" />
            <span className="text-[10px] text-zinc-500">Einsatz (normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-3 w-3 items-center justify-center rounded border-l-2 border-red-400 bg-red-500/10">
              <Zap size={6} className="text-red-400" />
            </div>
            <span className="text-[10px] text-zinc-500">
              Kritischer Einsatz
            </span>
          </div>
        </div>
      </div>

      <Separator className="my-2 shrink-0 bg-zinc-800" />

      <div className="shrink-0 px-3 pb-3">
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
  );
}
