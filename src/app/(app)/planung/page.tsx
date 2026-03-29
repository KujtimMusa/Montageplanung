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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Planung</h1>
      </div>
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
