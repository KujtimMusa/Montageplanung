"use client";

/**
 * Endlos-Marquee (Magic-UI-inspiriert) — reines CSS, duplizierter Inhalt.
 */
export function SocialProofStrip() {
  const text =
    "Vertrauen von Handwerksbetrieben in DE · AT · CH · Vertrauen von Handwerksbetrieben in DE · AT · CH · ";

  return (
    <section
      className="border-y border-white/10 bg-[#09090b]/80 py-4"
      aria-label="Vertrauen"
    >
      <div className="relative overflow-hidden">
        <div className="flex w-max animate-landing-marquee whitespace-nowrap will-change-transform">
          <span className="px-8 text-sm font-medium tracking-wide text-zinc-500">
            {text}
          </span>
          <span
            className="px-8 text-sm font-medium tracking-wide text-zinc-500"
            aria-hidden
          >
            {text}
          </span>
        </div>
      </div>
    </section>
  );
}
