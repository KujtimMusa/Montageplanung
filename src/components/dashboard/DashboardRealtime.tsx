"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardRealtimeProps = {
  children: React.ReactNode;
};

/**
 * Abonniert assignments, absences, projects — bei Änderung Server-Refresh + Skeleton.
 */
export function DashboardRealtime({ children }: DashboardRealtimeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const neuLaden = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        neuLaden
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absences" },
        neuLaden
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        neuLaden
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="relative">
      {isPending && (
        <div
          className="absolute inset-0 z-10 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/85 p-4 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 border border-zinc-800 bg-zinc-900" />
            <Skeleton className="h-28 border border-zinc-800 bg-zinc-900" />
            <Skeleton className="h-28 border border-zinc-800 bg-zinc-900" />
            <Skeleton className="h-28 border border-zinc-800 bg-zinc-900" />
          </div>
          <Skeleton className="h-40 border border-zinc-800 bg-zinc-900" />
        </div>
      )}
      <div className={cn(isPending && "pointer-events-none opacity-40")}>
        {children}
      </div>
    </div>
  );
}
