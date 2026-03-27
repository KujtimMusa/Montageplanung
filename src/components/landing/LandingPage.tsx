import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  GitMerge,
  Link2,
  Smartphone,
  Zap,
} from "lucide-react";

const features = [
  {
    titel: "Kalender",
    beschreibung: "Alle Monteure auf einen Blick. Drag & Drop.",
    icon: Calendar,
  },
  {
    titel: "Konflikte",
    beschreibung: "Doppelbuchungen sofort erkannt.",
    icon: GitMerge,
  },
  {
    titel: "Notfall",
    beschreibung: "Krankmeldung? Ersatz in Minuten.",
    icon: Zap,
  },
  {
    titel: "KI-Assistent",
    beschreibung: "Frag per Chat wer verfügbar ist.",
    icon: Bot,
  },
  {
    titel: "Personio-Sync",
    beschreibung: "Urlaub direkt aus Personio.",
    icon: Link2,
  },
  {
    titel: "Mobile & PWA",
    beschreibung: "Auf jedem Gerät, auch offline.",
    icon: Smartphone,
  },
] as const;

/**
 * Öffentliche Startseite — statisch (RSC).
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#030303] text-zinc-100 antialiased">
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-white"
          >
            <span className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80">
              <Calendar className="size-4 text-indigo-400" aria-hidden />
            </span>
            Montageplanung
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-white"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.25)] transition-opacity hover:opacity-95"
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 md:pb-32 md:pt-28">
          <div className="pointer-events-none absolute inset-0 landing-grid-mask opacity-90" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgb(39_39_42/0.5),transparent_65%)]"
            aria-hidden
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center rounded-full border border-zinc-700/80 px-4 py-1.5 text-xs font-medium text-zinc-300 landing-badge-shimmer">
              <span className="mr-2 inline-flex size-1.5 animate-pulse rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.9)]" />
              Jetzt verfügbar · Beta
            </div>

            <h1 className="text-balance bg-gradient-to-r from-white via-zinc-100 to-zinc-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl lg:text-7xl">
              Die smarte Einsatzplanung für Handwerksbetriebe
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400 md:text-xl">
              Kalender, Konflikte, Notfälle — alles an einem Ort. Gebaut für die
              Baustelle.
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register"
                className="group relative inline-flex h-12 min-h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.35)] transition-all hover:shadow-[0_0_48px_rgba(99,102,241,0.45)] sm:min-w-[200px]"
              >
                Jetzt registrieren
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/40 px-8 text-base font-semibold text-zinc-100 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800/50"
              >
                Anmelden
              </Link>
            </div>

            <p className="mt-8 text-xs font-medium tracking-wide text-zinc-500">
              DSGVO-konform · Frankfurt EU · Kostenlos starten
            </p>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-zinc-900 px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-2xl font-bold tracking-tight text-white md:text-3xl">
              Alles was du brauchst
            </h2>
            <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.titel}>
                    <div className="group h-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-zinc-600 hover:bg-zinc-800/50">
                      <div className="flex flex-col gap-4">
                        <div className="w-fit rounded-lg bg-blue-500/10 p-2 text-blue-400">
                          <Icon className="size-6" strokeWidth={1.5} aria-hidden />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight text-white">
                            {item.titel}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                            {item.beschreibung}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Bento */}
        <section className="border-t border-zinc-900 px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-white md:text-3xl">
              Ein Blick in die App
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2 lg:gap-5">
              {/* Groß: Kalender-Mock */}
              <div className="flex min-h-[320px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-2 lg:row-span-2">
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Ressourcenplanung
                </p>
                <div className="flex flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="mb-3 flex gap-1 border-b border-zinc-800 pb-2 text-[10px] text-zinc-500">
                    <span className="w-8" />
                    <span className="flex-1 text-center">Mo</span>
                    <span className="flex-1 text-center">Di</span>
                    <span className="flex-1 text-center">Mi</span>
                    <span className="flex-1 text-center">Do</span>
                    <span className="flex-1 text-center">Fr</span>
                  </div>
                  {["Team A", "Team B", "Team C"].map((row) => (
                    <div
                      key={row}
                      className="mb-2 flex items-center gap-1 border-b border-zinc-800/50 py-2 last:border-0"
                    >
                      <span className="w-8 shrink-0 text-[10px] text-zinc-500">
                        {row}
                      </span>
                      <div className="flex flex-1 gap-0.5">
                        <div className="relative h-8 flex-1 rounded bg-zinc-900">
                          <span className="absolute inset-y-1 left-0.5 right-1/3 rounded bg-indigo-500/70" />
                        </div>
                        <div className="relative h-8 flex-1 rounded bg-zinc-900">
                          <span className="absolute inset-y-1 left-1/4 right-0.5 rounded bg-blue-500/60" />
                        </div>
                        <div className="h-8 flex-1 rounded bg-zinc-900" />
                        <div className="relative h-8 flex-1 rounded bg-zinc-900">
                          <span className="absolute inset-y-1 left-0.5 right-1/4 rounded bg-emerald-500/50" />
                        </div>
                        <div className="h-8 flex-1 rounded bg-zinc-900" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rechts oben */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/40" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <h3 className="font-semibold text-white">Echtzeit-Updates</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Änderungen an Einsätzen erscheinen sofort für alle — ohne
                  manuelles Neuladen.
                </p>
              </div>

              {/* Rechts unten */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-1">
                <h3 className="font-semibold text-white">KI-Assistent</h3>
                <p className="mb-3 mt-1 text-sm text-zinc-500">
                  Fragen zur Planung
                </p>
                <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="ml-4 max-w-[90%] rounded-lg rounded-tr-sm bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
                    Wer ist nächste Woche in Team Süd frei?
                  </div>
                  <div className="mr-4 max-w-[90%] rounded-lg rounded-tl-sm border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
                    3 Monteure ohne Konflikt — Details in der Planung.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-24 sm:px-6 md:pb-32">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 px-6 py-12 text-center md:px-12 md:py-14">
            <div
              className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.12),transparent_55%)]"
              aria-hidden
            />
            <div className="relative">
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Bereit anzufangen?
              </h2>
              <p className="mt-3 text-sm text-zinc-400 md:text-base">
                Konto anlegen und direkt loslegen.
              </p>
              <div className="mt-8 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-xl" aria-hidden />
                  <Link
                    href="/register"
                    className="relative inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-base font-semibold text-white shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all hover:shadow-[0_0_52px_rgba(99,102,241,0.4)]"
                  >
                    Kostenlos registrieren
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-zinc-600">© 2026 Montageplanung</p>
        <p className="mt-2 text-xs text-zinc-600">DSGVO · Frankfurt EU</p>
      </footer>
    </div>
  );
}
