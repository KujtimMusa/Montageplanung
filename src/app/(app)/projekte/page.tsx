import { Suspense } from "react";
import { ProjekteKundenBereichInner } from "@/components/projekte/ProjekteKundenBereich";
import { Skeleton } from "@/components/ui/skeleton";

function ProjekteKundenFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-14 w-full rounded-2xl bg-zinc-800" />
      <div className="flex justify-between">
        <Skeleton className="h-9 w-56 bg-zinc-800" />
        <Skeleton className="h-9 w-36 bg-zinc-800" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl bg-zinc-800" />
    </div>
  );
}

export default function ProjekteSeite() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Suspense fallback={<ProjekteKundenFallback />}>
        <ProjekteKundenBereichInner />
      </Suspense>
    </div>
  );
}
