"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard, Menu, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinkClass =
  "relative text-sm font-medium text-zinc-400 transition-colors hover:text-white after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-blue-500 after:transition-all after:duration-200 hover:after:w-full";

const primaryCtaClass =
  "inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-[length:200%_100%] px-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] transition-[background-position,box-shadow,transform] duration-200 hover:scale-[1.03] hover:bg-right hover:shadow-[0_0_36px_rgba(59,130,246,0.5)]";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,backdrop-filter,border-color] duration-200",
        scrolled
          ? "border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
      initial={false}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-white"
          aria-label="Montageplanung Startseite"
        >
          <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-inner">
            <LayoutDashboard className="size-[18px] text-blue-400" aria-hidden />
          </span>
          <span className="text-base sm:text-lg">Montageplanung</span>
        </Link>

        <nav
          className="hidden items-center gap-2 md:flex"
          aria-label="Hauptnavigation"
        >
          <Link href="/login" className={cn(navLinkClass, "px-3 py-2")}>
            Anmelden
          </Link>
          <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
            <Link href="/register" className={primaryCtaClass}>
              Kostenlos starten
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </motion.div>
        </nav>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-zinc-200 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Menü öffnen"
        >
          <Menu className="size-5" />
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            showCloseButton
            className="border-l border-white/10 bg-[#09090b]/98 p-0 backdrop-blur-xl sm:max-w-sm"
          >
            <SheetHeader className="border-b border-white/10 p-4 text-left">
              <SheetTitle className="font-semibold text-white">
                Navigation
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 p-4">
              <Link
                href="/login"
                className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25"
                onClick={() => setMobileOpen(false)}
              >
                Kostenlos starten
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.header>
  );
}
