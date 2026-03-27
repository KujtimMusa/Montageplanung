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
        <h1 className="text-2xl font-bold tracking-tight">Planung</h1>
        <p className="text-muted-foreground">
          Ressourcen-Timeline, Ziehen & Ablegen, Konfliktprüfung vor dem Speichern.
        </p>
      </div>
      <PlanungsKalender />
    </div>
  );
}
