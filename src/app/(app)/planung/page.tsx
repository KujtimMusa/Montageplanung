import dynamic from "next/dynamic";

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
        <p className="text-sm text-zinc-400">
          Team-Zeilen mit Farben, Abwesenheiten im Hintergrund, Drag &amp; Drop,
          Konflikt-Hinweise und ungeplante Projekte per Ziehen einplanen.
        </p>
      </div>
      <PlanungsKalender />
    </div>
  );
}
