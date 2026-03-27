"use client";

import {
  AlertTriangle,
  Bot,
  Calendar,
  RefreshCw,
  Smartphone,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const features = [
  {
    titel: "Kalender",
    beschreibung: "Alle Monteure auf einen Blick. Drag & Drop.",
    icon: Calendar,
    glow: "shadow-[0_0_24px_rgba(59,130,246,0.35)] text-blue-400",
    ring: "ring-blue-500/20",
  },
  {
    titel: "Konflikte",
    beschreibung: "Doppelbuchungen sofort erkannt.",
    icon: AlertTriangle,
    glow: "shadow-[0_0_24px_rgba(99,102,241,0.35)] text-indigo-400",
    ring: "ring-indigo-500/20",
  },
  {
    titel: "Notfall",
    beschreibung: "Krankmeldung? Ersatz in Minuten.",
    icon: Zap,
    glow: "shadow-[0_0_24px_rgba(16,185,129,0.35)] text-emerald-400",
    ring: "ring-emerald-500/20",
  },
  {
    titel: "KI-Assistent",
    beschreibung: "Frag per Chat wer verfügbar ist.",
    icon: Bot,
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.35)] text-violet-400",
    ring: "ring-violet-500/20",
  },
  {
    titel: "Personio-Sync",
    beschreibung: "Urlaub direkt aus Personio.",
    icon: RefreshCw,
    glow: "shadow-[0_0_24px_rgba(249,115,22,0.35)] text-orange-400",
    ring: "ring-orange-500/20",
  },
  {
    titel: "Mobile & PWA",
    beschreibung: "Auf jedem Gerät, auch offline.",
    icon: Smartphone,
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.35)] text-cyan-400",
    ring: "ring-cyan-500/20",
  },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function FeaturesGrid() {
  return (
    <section
      className="px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          id="features-heading"
          className="text-center font-sans text-3xl font-bold tracking-tight text-white md:text-4xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
        >
          Alles was du brauchst
        </motion.h2>
        <motion.ul
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.li key={f.titel} variants={item}>
                <div
                  className={cn(
                    "group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition-[border-color,box-shadow] duration-200",
                    "hover:border-blue-500/50 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15),0_0_32px_rgba(59,130,246,0.12)]"
                  )}
                >
                  <div className="flex flex-col gap-4">
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-xl bg-white/[0.06] ring-1 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105",
                        f.ring,
                        f.glow
                      )}
                    >
                      <Icon className="size-6" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-white">
                        {f.titel}
                      </h3>
                      <p className="mt-2 text-sm font-normal leading-relaxed text-zinc-400">
                        {f.beschreibung}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
