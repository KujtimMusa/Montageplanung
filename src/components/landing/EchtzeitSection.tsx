"use client";

import { motion } from "framer-motion";

export function EchtzeitSection() {
  return (
    <section className="px-4 py-16 sm:px-6 md:py-20" aria-labelledby="realtime-heading">
      <motion.div
        className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center backdrop-blur-md md:px-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/40" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          </span>
          <span
            id="realtime-heading"
            className="text-sm font-semibold uppercase tracking-wider text-emerald-400"
          >
            Echtzeit-Updates
          </span>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-zinc-300">
          Änderungen an Einsätzen erscheinen sofort für alle — ohne manuelles
          Neuladen.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-300">
            Supabase Realtime
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-zinc-300">
            Immer synchron
          </span>
        </div>
      </motion.div>
    </section>
  );
}
