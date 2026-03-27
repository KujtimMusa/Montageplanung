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
          Projekte als Zeilen, Tage klar lesbar, Monatsansicht übersichtlich. Projekt
          zuerst auf den Tag ziehen, Team von rechts zuordnen — Uhrzeit und Ort auf
          jeder Karte.
        </p>
      </div>
      <PlanungsKalender />
    </div>
  );
}
