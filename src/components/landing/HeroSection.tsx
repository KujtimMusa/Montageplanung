"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedBadge } from "@/components/landing/AnimatedBadge";

function HeroAppPreview() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/50 ring-1 ring-white/5">
      <div className="border-b border-white/10 bg-zinc-900/50 px-3 py-2">
        <div className="mx-auto flex max-w-full items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/80" />
            <span className="size-2.5 rounded-full bg-amber-500/80" />
            <span className="size-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-medium text-zinc-500">
            Ressourcenplanung
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="mb-2 flex gap-1 border-b border-white/10 pb-2 text-[10px] text-zinc-500">
          <span className="w-10 shrink-0" />
          <span className="flex-1 text-center">Mo</span>
          <span className="flex-1 text-center">Di</span>
          <span className="flex-1 text-center">Mi</span>
          <span className="flex-1 text-center">Do</span>
          <span className="flex-1 text-center">Fr</span>
        </div>
        {["Team A", "Team B", "Team C"].map((row) => (
          <div
            key={row}
            className="mb-2 flex items-center gap-1 border-b border-white/5 py-1.5 last:border-0"
          >
            <span className="w-10 shrink-0 text-[10px] text-zinc-500">
              {row}
            </span>
            <div className="flex flex-1 gap-0.5">
              <div className="relative h-7 flex-1 rounded-md bg-zinc-900/90">
                <span className="absolute inset-y-1 left-0.5 right-1/3 rounded bg-indigo-500/75" />
              </div>
              <div className="relative h-7 flex-1 rounded-md bg-zinc-900/90">
                <span className="absolute inset-y-1 left-1/4 right-0.5 rounded bg-blue-500/65" />
              </div>
              <div className="h-7 flex-1 rounded-md bg-zinc-900/90" />
              <div className="relative h-7 flex-1 rounded-md bg-zinc-900/90">
                <span className="absolute inset-y-1 left-0.5 right-1/4 rounded bg-emerald-500/55" />
              </div>
              <div className="h-7 flex-1 rounded-md bg-zinc-900/90" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#0a0a0a] px-4 pb-20 pt-12 sm:px-6 md:pb-28 md:pt-16"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 landing-grid-mask opacity-[0.5]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(59,130,246,0.12)_0%,transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center"
          >
            <AnimatedBadge>Jetzt verfügbar · Beta</AnimatedBadge>
          </motion.div>

          <motion.h1
            id="hero-heading"
            className="font-sans font-extrabold leading-[1.1] tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 5vw, 4rem)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="block text-white sm:whitespace-nowrap">
              Die smarte Einsatzplanung
            </span>
            <span className="mt-1 block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              für Handwerksbetriebe
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-2xl text-pretty text-base font-normal leading-relaxed text-zinc-400 md:text-lg md:font-medium"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            Kalender, Konflikte, Notfälle — alles an einem Ort. Gebaut für die
            Baustelle.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <Link
                href="/register"
                className="inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-[length:200%_100%] px-8 text-base font-semibold text-white shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-[background-position,box-shadow] duration-200 hover:bg-right hover:shadow-[0_0_48px_rgba(59,130,246,0.55)] sm:w-auto sm:min-w-[220px]"
              >
                Jetzt registrieren
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
              <Link
                href="/login"
                className="inline-flex h-12 min-h-12 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-8 text-base font-semibold text-zinc-100 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/[0.08] sm:w-auto sm:min-w-[160px]"
              >
                Anmelden
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.45 }}
          >
            <span>✓ DSGVO-konform</span>
            <span>✓ Serverstandort Frankfurt</span>
            <span>✓ Kostenlos starten</span>
          </motion.div>
        </div>

        <motion.div
          className="mx-auto mt-14 max-w-5xl"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.65 }}
        >
          <motion.div
            className="group relative mx-auto"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-2xl shadow-[0_32px_120px_-24px_rgba(59,130,246,0.35)] transition-[filter] duration-200 group-hover:shadow-[0_40px_140px_-20px_rgba(59,130,246,0.45)]"
            >
              <HeroAppPreview />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
