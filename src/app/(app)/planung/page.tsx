import dynamic from "next/dynamic";
import { Suspense } from "react";

const PlanungsKalender = dynamic(
  () =>
    import("@/components/kalender/PlanungsKalender").then((m) => ({
      default: m.PlanungsKalender,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Kalender wird geladen…</p>
    ),
  }
);

export default function PlanungSeite() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="mb-3 shrink-0 text-2xl font-bold tracking-tight text-zinc-50">
        Planung
      </h1>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Kalender wird geladen…</p>
        }
      >
        <PlanungsKalender />
      </Suspense>
    </div>
  );
}
