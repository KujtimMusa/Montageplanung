"use client";

import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const features = [
  {
    titel: "Ressourcenplanung",
    text: "Wer arbeitet wann wo. Auf einen Blick.",
    icon: CalendarDays,
    accent: "blue" as const,
  },
  {
    titel: "Konflikte erkennen",
    text: "Doppelbuchungen und Engpässe — bevor sie passieren.",
    icon: AlertTriangle,
    accent: "orange" as const,
  },
  {
    titel: "Notfallmanagement",
    text: "Krankmeldung heute. Ersatz in Minuten gefunden.",
    icon: Zap,
    accent: "emerald" as const,
  },
  {
    titel: "KI-gestützte Planung",
    text: "Optimale Teamzuweisung auf Knopfdruck.",
    icon: Bot,
    accent: "violet" as const,
  },
  {
    titel: "Automatische Benachrichtigungen",
    text: "Monteure erhalten Einsätze direkt aufs Handy.",
    icon: Bell,
    accent: "cyan" as const,
  },
  {
    titel: "Auslastung im Blick",
    text: "Überlastung und Leerlauf auf einen Blick erkennen.",
    icon: BarChart3,
    accent: "indigo" as const,
  },
] as const;

const accentStyles = {
  blue: {
    icon: "text-blue-400 drop-shadow-[0_0_14px_rgba(59,130,246,0.45)]",
    hoverBorder: "hover:border-blue-500/30",
  },
  orange: {
    icon: "text-orange-400 drop-shadow-[0_0_14px_rgba(249,115,22,0.45)]",
    hoverBorder: "hover:border-orange-500/30",
  },
  emerald: {
    icon: "text-emerald-400 drop-shadow-[0_0_14px_rgba(16,185,129,0.45)]",
    hoverBorder: "hover:border-emerald-500/30",
  },
  violet: {
    icon: "text-violet-400 drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]",
    hoverBorder: "hover:border-violet-500/30",
  },
  cyan: {
    icon: "text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.45)]",
    hoverBorder: "hover:border-cyan-500/30",
  },
  indigo: {
    icon: "text-indigo-400 drop-shadow-[0_0_14px_rgba(99,102,241,0.45)]",
    hoverBorder: "hover:border-indigo-500/30",
  },
} as const;

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
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
        >
          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight text-white"
          >
            Gebaut für die Praxis
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Keine Zettelwirtschaft. Keine WhatsApp-Gruppen. Nur klare Planung.
          </p>
        </motion.div>
        <motion.ul
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            const a = accentStyles[f.accent];
            return (
              <motion.li key={f.titel} variants={item}>
                <div
                  className={cn(
                    "group h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-200",
                    "hover:bg-white/[0.05]",
                    a.hoverBorder
                  )}
                >
                  <Icon
                    className={cn("size-7 stroke-[1.5]", a.icon)}
                    aria-hidden
                  />
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {f.titel}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
