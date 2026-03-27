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

/** Einheitliche Akzentfarbe (Blau) — Buttons & Fokus, kein weiteres Farbenspiel. */
const accent =
  "bg-[#2563eb] text-white hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";

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
 * Öffentliche Startseite — statisch, ohne Supabase (RSC).
 * Session: Middleware leitet eingeloggte Nutzer von / → /dashboard.
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white antialiased">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-white"
          >
            <span className="flex size-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100">
              <Calendar className="size-4" aria-hidden />
            </span>
            Montageplanung
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800/80 hover:text-white"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-opacity ${accent}`}
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* 2. Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 md:pb-28 md:pt-24 lg:pt-28">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(37,99,235,0.12),transparent_55%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mb-6 inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950/50 px-3 py-1 text-xs font-medium text-zinc-400">
              Jetzt verfügbar
            </p>
            <h1 className="text-balance text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
              Die smarte Einsatzplanung für Handwerksbetriebe
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400 md:text-xl">
              Kalender, Konflikte, Notfälle — alles an einem Ort. Gebaut für die
              Baustelle.
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/register"
                className={`inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-xl px-8 text-base font-semibold transition-opacity sm:min-w-[200px] ${accent}`}
              >
                Jetzt registrieren
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-xl border border-zinc-700 bg-transparent px-8 text-base font-semibold text-white transition-colors hover:border-zinc-600 hover:bg-zinc-900/50"
              >
                Anmelden
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Features */}
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
                    <div className="h-full rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-600">
                      <div className="flex flex-col gap-4">
                        <Icon
                          className="size-6 shrink-0 text-white"
                          strokeWidth={1.5}
                          aria-hidden
                        />
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

        {/* 4. CTA */}
        <section className="px-4 pb-20 sm:px-6 md:pb-28">
          <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-12 text-center md:px-12 md:py-14">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Bereit anzufangen?
            </h2>
            <p className="mt-3 text-sm text-zinc-400 md:text-base">
              Konto anlegen und direkt loslegen.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className={`inline-flex h-12 min-h-12 items-center justify-center gap-2 rounded-xl px-8 text-base font-semibold ${accent}`}
              >
                Kostenlos registrieren
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Footer */}
      <footer className="border-t border-zinc-900 px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-zinc-600">© 2026 Montageplanung</p>
        <p className="mt-2 text-xs text-zinc-600">DSGVO · Frankfurt EU</p>
      </footer>
    </div>
  );
}
