"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onPrev}
          title="Zurück"
        >
          <ChevronLeft size={14} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onHeute}
        >
          Heute
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onNext}
          title="Vor"
        >
          <ChevronRight size={14} />
        </Button>
      </div>

      <span className="mx-auto text-sm font-semibold text-zinc-200">
        {zeitraumLabel || "…"}
      </span>

      <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-zinc-900 p-0.5">
        <Button
          type="button"
          size="sm"
          className={`h-6 px-2 text-xs ${
            ansicht === "week"
              ? "bg-zinc-700 text-zinc-100"
              : "bg-transparent hover:bg-zinc-800"
          }`}
          onClick={() => onAnsicht("week")}
        >
          Woche
        </Button>
        <Button
          type="button"
          size="sm"
          className={`h-6 px-2 text-xs ${
            ansicht === "month"
              ? "bg-zinc-700 text-zinc-100"
              : "bg-transparent hover:bg-zinc-800"
          }`}
          onClick={() => onAnsicht("month")}
        >
          Monat
        </Button>
      </div>
    </div>
  );
}
