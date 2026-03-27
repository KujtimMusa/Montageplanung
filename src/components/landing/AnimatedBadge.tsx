"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AnimatedBadgeProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Outline-Badge mit grünem Pulse-Dot (Magic-UI-inspiriert).
 */
export function AnimatedBadge({ children, className }: AnimatedBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "relative border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm",
        className
      )}
    >
      <span
        className="relative mr-2 inline-flex size-2"
        aria-hidden
      >
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/50" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
      </span>
      {children}
    </Badge>
  );
}
