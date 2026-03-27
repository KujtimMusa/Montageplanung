import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-300 transition-colors hover:text-white"
        >
          <span className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
            <LayoutDashboard className="size-4 text-blue-400" aria-hidden />
          </span>
          © 2026 Montageplanung
        </Link>
        <p className="text-center text-xs font-medium text-zinc-500">
          DSGVO · Frankfurt EU
        </p>
      </div>
    </footer>
  );
}
