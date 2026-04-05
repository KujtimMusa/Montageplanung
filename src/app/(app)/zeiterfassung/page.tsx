import { ZeiterfassungClient } from "@/components/zeiterfassung/ZeiterfassungClient";

export default function ZeiterfassungPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Zeiterfassung</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live-Status, Tages- und Wochenauswertung
          </p>
        </div>
      </div>
      <ZeiterfassungClient />
    </div>
  );
}
