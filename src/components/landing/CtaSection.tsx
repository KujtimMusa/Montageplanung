"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="px-4 pb-24 pt-8 sm:px-6 md:pb-32" aria-labelledby="cta-heading">
      <motion.div
        className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 px-6 py-14 text-center md:px-12"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_100%,rgba(59,130,246,0.18),transparent_55%)]"
          aria-hidden
        />
        <div className="relative">
          <h2
            id="cta-heading"
            className="font-sans text-3xl font-bold tracking-tight text-white md:text-4xl"
          >
            Bereit anzufangen?
          </h2>
          <p className="mt-3 text-base font-normal text-zinc-400 md:text-lg">
            Konto anlegen und direkt loslegen.
          </p>
          <motion.div
            className="mt-10 flex justify-center"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-[length:200%_100%] px-8 text-base font-semibold text-white shadow-[0_0_40px_rgba(59,130,246,0.45)] transition-[background-position,box-shadow] duration-200 hover:bg-right hover:shadow-[0_0_56px_rgba(59,130,246,0.55)]"
            >
              Kostenlos registrieren
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
