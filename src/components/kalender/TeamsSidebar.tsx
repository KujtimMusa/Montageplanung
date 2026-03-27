"use client";

import { Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export type TeamSidebarEintrag = {
  id: string;
  name: string;
  farbe: string;
  abteilung: string | null;
  mitglieder: { id: string; name: string }[];
};

type Props = {
  teams: TeamSidebarEintrag[];
  einsaetzeProTeamZeitraum: Record<string, number>;
  heuteEinsaetze: number;
  heuteAbwesenheiten: number;
};

export function TeamsSidebar({
  teams,
  einsaetzeProTeamZeitraum,
  heuteEinsaetze,
  heuteAbwesenheiten,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="shrink-0 border-b border-zinc-800 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Teams &amp; Legende
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="pb-2 pr-1 pt-1">
          {teams.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-zinc-500">
              Noch keine Teams angelegt.
            </p>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="mx-2 my-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5"
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
              </div>
            ))
          )}
        </div>
      </ScrollArea>

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
