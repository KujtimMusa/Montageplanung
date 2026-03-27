import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";

const highlights = [
  {
    titel: "Ressourcen-Kalender",
    beschreibung:
      "Einsätze pro Mitarbeiter in der Timeline — übersichtlich und mobil nutzbar.",
    icon: CalendarDays,
  },
  {
    titel: "Konflikt-Erkennung",
    beschreibung:
      "Überschneidungen werden sofort erkannt — bevor es im Alltag knallt.",
    icon: ShieldAlert,
  },
  {
    titel: "Notfall-Modus",
    beschreibung:
      "Kurzfristige Ausfälle strukturiert abfangen und Teams informieren.",
    icon: AlertTriangle,
  },
  {
    titel: "KI-Assistent",
    beschreibung:
      "Gemini Flash unterstützt Planung, Kommunikation und Auswertung.",
    icon: Bot,
  },
];

/** Link-Stile ohne Import aus client-only `button.tsx` (RSC-sicher). */
const stil = {
  headerGhost:
    "inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted",
  headerPrimary:
    "inline-flex h-7 items-center justify-center rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition-colors hover:bg-primary/90",
  heroPrimary:
    "inline-flex h-9 min-h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 w-full sm:w-auto",
  heroOutline:
    "inline-flex h-9 min-h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-muted w-full sm:w-auto",
} as const;

/**
 * Öffentliche Marketing-Startseite (Mobile-First), reine Server-Komponente.
 * Eingeloggte Nutzer: Middleware leitet / → /dashboard.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-semibold text-primary">Monteurplanung</span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={stil.headerGhost}>
              Anmelden
            </Link>
            <Link href="/register" className={stil.headerPrimary}>
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-background to-background px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
              Solar & Montage
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
              Montageplanung
            </h1>
            <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">
              Die zentrale Plattform für Teams, Einsätze und Ausnahmen — gebaut für
              die Baustelle, nicht für den Schreibtisch allein.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className={stil.heroPrimary}>
                Anmelden
              </Link>
              <Link href="/register" className={stil.heroOutline}>
                Registrieren
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <h2 className="text-center text-xl font-semibold md:text-2xl">
            Was die App für dich löst
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h) => {
              const Icon = h.icon;
              return (
                <li key={h.titel}>
                  <Card className="h-full border-muted-foreground/15 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="space-y-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <CardTitle className="text-base">{h.titel}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {h.beschreibung}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t bg-muted/30 px-4 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              Datenhaltung EU (Frankfurt), mobile Oberfläche, PWA-ready — bereit für
              den nächsten Ausbau.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Monteurplanung
      </footer>
    </div>
  );
}
