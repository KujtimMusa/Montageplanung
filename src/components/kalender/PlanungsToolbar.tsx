"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  zeitraumLabel: string;
  ansicht: "week" | "month";
  onAnsicht: (a: "week" | "month") => void;
  onPrev: () => void;
  onNext: () => void;
  onHeute: () => void;
};

export function PlanungsToolbar({
  zeitraumLabel,
  ansicht,
  onAnsicht,
  onPrev,
  onNext,
  onHeute,
}: Props) {
  return (
    <div
      className={cn(
        "flex h-[52px] shrink-0 items-center justify-between border-b border-zinc-800/60 bg-zinc-950 px-4"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Zurück"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={onHeute}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          Heute
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Vor"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="text-sm font-semibold text-zinc-200">
        {zeitraumLabel || "…"}
      </div>

      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
        {(["Woche", "Monat"] as const).map((a) => {
          const key = a === "Woche" ? "week" : "month";
          return (
            <button
              key={a}
              type="button"
              onClick={() => onAnsicht(key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                ansicht === key
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {a}
            </button>
          );
        })}
      </div>
    </div>
  );
}
