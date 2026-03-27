"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function KalenderMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl">
      <div className="border-b border-white/10 px-3 py-2 text-[10px] text-zinc-500">
        Ressourcenplanung
      </div>
      <div className="p-3">
        <div className="mb-2 flex gap-1 border-b border-white/10 pb-2 text-[10px] text-zinc-500">
          <span className="w-8" />
          <span className="flex-1 text-center">Mo–Fr</span>
        </div>
        {["Team A", "Team B"].map((row) => (
          <div
            key={row}
            className="mb-2 flex items-center gap-1 border-b border-white/5 py-2 last:border-0"
          >
            <span className="w-8 shrink-0 text-[10px] text-zinc-500">{row}</span>
            <div className="flex flex-1 gap-0.5">
              <div className="relative h-8 flex-1 rounded bg-zinc-900">
                <span className="absolute inset-y-1 left-0.5 right-1/3 rounded bg-indigo-500/75" />
              </div>
              <div className="relative h-8 flex-1 rounded bg-zinc-900">
                <span className="absolute inset-y-1 left-1/4 right-0.5 rounded bg-blue-500/65" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMockup() {
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[0.04] shadow-xl backdrop-blur-md">
      <CardHeader className="border-b border-white/10 pb-3">
        <CardTitle className="text-sm font-semibold text-white">
          KI-Assistent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="ml-6 max-w-[92%] rounded-xl rounded-tr-sm border border-white/10 bg-zinc-800/80 px-3 py-2 text-xs text-zinc-200">
          Wer ist nächste Woche in Team Süd frei?
        </div>
        <div className="mr-6 max-w-[92%] rounded-xl rounded-tl-sm border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
          3 Monteure ohne Konflikt — Details in der Planung.
        </div>
      </CardContent>
    </Card>
  );
}

export function FeatureSpotlight() {
  return (
    <section className="space-y-24 px-4 py-12 sm:px-6 md:space-y-32 md:py-20">
      {/* Block A */}
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55 }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <KalenderMockup />
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="font-sans text-3xl font-bold tracking-tight text-white md:text-4xl">
            Ressourcenplanung auf einen Blick
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              "Timeline-Ansicht für Teams und Projekte",
              "Drag & Drop für schnelle Umfirmierungen",
              "Konflikte und Abwesenheiten direkt sichtbar",
            ].map((text) => (
              <li key={text} className="flex gap-3 text-zinc-300">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                  <Check className="size-3.5" aria-hidden />
                </span>
                <span className="text-base font-medium leading-relaxed">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Block B — reversed */}
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          className="order-2 lg:order-1"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="font-sans text-3xl font-bold tracking-tight text-white md:text-4xl">
            KI-Assistent für die Baustelle
          </h2>
          <p className="mt-4 text-lg font-normal text-zinc-400">
            Stelle Fragen in natürlicher Sprache — Verfügbarkeiten,
            Projekte, Konflikte.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-left text-xs leading-relaxed text-emerald-300/90 backdrop-blur-sm">
            <code>
              {`> wer hat donnerstag kapazität?\n→ Team Nord: 2 Monteure frei.`}
            </code>
          </pre>
        </motion.div>
        <motion.div
          className="order-1 lg:order-2"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55 }}
        >
          <ChatMockup />
        </motion.div>
      </div>
    </section>
  );
}
