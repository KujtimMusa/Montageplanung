import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  CloudSun,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

const features = [
  {
    titel: "Ressourcen-Kalender",
    beschreibung:
      "Einsätze pro Mitarbeiter in der Timeline — übersichtlich und mobil nutzbar.",
    icon: CalendarDays,
    iconWrap: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25",
  },
  {
    titel: "Konflikt-Erkennung",
    beschreibung:
      "Überschneidungen werden sofort erkannt — bevor es im Alltag knallt.",
    icon: ShieldAlert,
    iconWrap: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/25",
  },
  {
    titel: "Notfall-Modus",
    beschreibung:
      "Kurzfristige Ausfälle strukturiert abfangen und Teams informieren.",
    icon: AlertTriangle,
    iconWrap: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25",
  },
  {
    titel: "KI-Assistent",
    beschreibung:
      "Gemini Flash unterstützt Planung, Kommunikation und Auswertung.",
    icon: Bot,
    iconWrap: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25",
  },
  {
    titel: "Wetter-Warnungen",
    beschreibung:
      "Proaktive Hinweise zu Wetterlagen, die Einsätze und Sicherheit betreffen.",
    icon: CloudSun,
    iconWrap: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25",
  },
  {
    titel: "Mobile-First",
    beschreibung:
      "Baustelle zuerst: schnelle Bedienung auf dem Handy, PWA-ready offline-freundlich.",
    icon: Smartphone,
    iconWrap: "bg-fuchsia-500/15 text-fuchsia-400 ring-1 ring-fuchsia-500/25",
  },
] as const;

const stats = [
  { value: "20 Wo.", label: "Entwicklung" },
  { value: "0–5€", label: "pro Monat" },
  { value: "100%", label: "DSGVO" },
] as const;

/** RSC-sichere Link-/Button-Klassen (kein Import aus client-only `button.tsx`). */
const stil = {
  navGhost:
    "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-foreground/90 transition-colors hover:bg-foreground/5 dark:hover:bg-white/10",
  navPrimary:
    "inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-950",
  heroPrimary:
    "group inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-8 text-base font-semibold text-background transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-950",
  heroOutline:
    "inline-flex h-12 min-h-12 items-center justify-center rounded-xl border border-foreground/15 bg-background/60 px-8 text-base font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-foreground/5 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
  ctaWhite:
    "inline-flex h-12 min-h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-zinc-950 transition-opacity hover:opacity-90",
} as const;

/**
 * Öffentliche Marketing-Startseite (Mobile-First), reine Server-Komponente.
 * Eingeloggte Nutzer: Middleware leitet / → /dashboard.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Navbar: Glasmorphism (sticky + backdrop, Inhalt scrollt darunter) */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 dark:bg-white/10 dark:text-white dark:ring-white/10">
              <CalendarDays className="size-[18px]" aria-hidden />
            </span>
            <span>Monteurplanung</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className={stil.navGhost}>
              Anmelden
            </Link>
            <Link href="/register" className={stil.navPrimary}>
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: Grid + radial gradient, kein reines Weiß */}
        <section className="relative overflow-hidden border-b border-border/40 px-4 py-24 sm:px-6 md:py-32 lg:py-40">
          <div className="pointer-events-none absolute inset-0 bg-zinc-50 dark:bg-zinc-950" />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,rgba(99,102,241,0.14),transparent_55%)] dark:bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,rgba(129,140,248,0.18),transparent_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:linear-gradient(to_right,rgba(0,0,0,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.055)_1px,transparent_1px)] [background-size:4rem_4rem] dark:opacity-100 dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]"
            aria-hidden
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-6 inline-flex items-center rounded-full border border-foreground/10 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="mr-1.5 text-primary" aria-hidden>
                ✦
              </span>
              KI-gestützte Einsatzplanung
            </p>
            <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Montageplanung, die mitdenkt.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              Die zentrale Plattform für Teams, Einsätze und Ausnahmen — gebaut für
              die Baustelle, nicht nur für den Schreibtisch.
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-center">
              <Link href="/register" className={stil.heroPrimary}>
                Jetzt starten
                <ArrowRight
                  className="size-5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link href="/login" className={stil.heroOutline}>
                Anmelden
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border/40 bg-muted/25 px-4 py-16 dark:bg-zinc-900/40 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col divide-y divide-border/50 md:flex-row md:divide-x md:divide-y-0">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-1 flex-col items-center py-8 text-center md:py-0 md:px-10"
              >
                <span className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                  {s.value}
                </span>
                <span className="mt-2 text-sm font-medium text-muted-foreground">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Features: dunkle Section */}
        <section className="bg-zinc-950 px-4 py-20 text-zinc-50 sm:px-6 md:py-28 dark:bg-zinc-950">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
              Alles, was die Planung braucht
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-400 md:text-base">
              Von Kalender bis KI — ein durchdachtes Paket für Solar- und
              Montageteams.
            </p>
            <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((h) => {
                const Icon = h.icon;
                return (
                  <li key={h.titel}>
                    <Card className="group h-full border-zinc-800 bg-zinc-900 text-zinc-50 shadow-none transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/90 hover:shadow-lg hover:shadow-black/20">
                      <CardHeader className="space-y-4 p-6">
                        <div
                          className={`flex size-11 items-center justify-center rounded-xl ${h.iconWrap}`}
                        >
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <CardTitle className="text-lg font-semibold leading-snug text-zinc-50">
                          {h.titel}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed text-zinc-400">
                          {h.beschreibung}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-zinc-800 bg-zinc-950 px-4 py-20 text-center sm:px-6 md:py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Bereit loszulegen?
            </h2>
            <p className="mt-4 text-zinc-400">
              In wenigen Minuten registrieren — und Teams strukturiert durch den
              Einsatzalltag führen.
            </p>
            <div className="mt-10">
              <Link href="/register" className={stil.ctaWhite}>
                Kostenlos registrieren
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-background px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-white/10 dark:text-white">
              <CalendarDays className="size-4" aria-hidden />
            </span>
            Monteurplanung
          </Link>
          <p className="text-sm text-muted-foreground md:text-right">
            Datenschutz DSGVO · Frankfurt EU · PWA-ready
          </p>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} Monteurplanung
        </p>
      </footer>
    </div>
  );
}
