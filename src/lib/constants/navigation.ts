import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavEintrag = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Desktop-Sidebar — Planung & Steuerung für Führungskräfte */
export const sidebarNavigation: NavEintrag[] = [
  { href: "/planung", label: "Planung", icon: CalendarDays },
  { href: "/teams", label: "Teams & Mitarbeiter", icon: Users },
  { href: "/notfall", label: "Notfall", icon: AlertTriangle },
  { href: "/ki-assistent", label: "KI-Assistent", icon: Bot },
  { href: "/dienstleister", label: "Dienstleister", icon: Truck },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

/** Mobil: gleiche Kernpunkte (scrollbar/kompakt) */
export const bottomNavigation: NavEintrag[] = [
  { href: "/planung", label: "Planung", icon: CalendarDays },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/notfall", label: "Notfall", icon: AlertTriangle },
  { href: "/ki-assistent", label: "KI", icon: Bot },
  { href: "/dienstleister", label: "DL", icon: Truck },
  { href: "/einstellungen", label: "Mehr", icon: Settings },
];

export function sidebarEinträgeFiltern(
  einträge: NavEintrag[],
  darfTeamsSeite: boolean
): NavEintrag[] {
  if (darfTeamsSeite) return einträge;
  return einträge.filter((e) => e.href !== "/teams");
}
