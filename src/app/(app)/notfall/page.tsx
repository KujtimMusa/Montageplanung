import { NotfallModus } from "@/components/notfall/NotfallModus";

export default function NotfallSeite() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-red-900/40 bg-gradient-to-b from-red-950/50 to-zinc-950 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-red-100">
          Notfallplan
        </h1>
        <p className="mt-1 text-sm text-red-200/80">
          Kurzfristiger Ausfall — betroffene Einsätze und konfliktfreie Ersatzkräfte
          aus derselben Abteilung.
        </p>
      </div>
      <NotfallModus />
    </div>
  );
}
