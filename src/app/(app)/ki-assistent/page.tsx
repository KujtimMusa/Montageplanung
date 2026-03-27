import { KiAssistentSeite } from "@/components/agenten/KiAssistentSeite";

export default function KiAssistentRoute() {
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          KI-Assistent
        </h1>
        <p className="text-sm text-zinc-400">
          Fragen zu Verfügbarkeit, Konflikten und Planung — mit Kontext aus Ihrer
          Datenbank.
        </p>
      </div>
      <KiAssistentSeite />
    </div>
  );
}
