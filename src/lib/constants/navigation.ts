import {
  AlertTriangle,
  Bot,
  CalendarDays,
  CalendarOff,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavEintrag = {
  href: string;
  label: string;
  /** Kurzlabel für die mobile Bottom-Navigation */
  labelKurz: string;
  icon: LucideIcon;
};

/** Desktop-Sidebar & gemeinsame Reihenfolge */
export const sidebarNavigation: NavEintrag[] = [
  { href: "/dashboard", label: "Dashboard", labelKurz: "Home", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", labelKurz: "Teams", icon: Users },
  {
    href: "/abwesenheiten",
    label: "Abwesenheiten",
    labelKurz: "Abwes.",
    icon: CalendarOff,
  },
  { href: "/projekte", label: "Projekte", labelKurz: "Proj.", icon: FolderKanban },
  { href: "/planung", label: "Planung", labelKurz: "Plan", icon: CalendarDays },
  {
    href: "/notfall",
    label: "Notfallplan",
    labelKurz: "Notfall",
    icon: AlertTriangle,
  },
  {
    href: "/dienstleister",
    label: "Dienstleister",
    labelKurz: "DL",
    icon: Truck,
  },
  {
    href: "/ki-assistent",
    label: "KI-Assistent",
    labelKurz: "KI",
    icon: Bot,
  },
  {
    href: "/einstellungen",
    label: "Einstellungen",
    labelKurz: "Mehr",
    icon: Settings,
  },
];

/** Mobil: gleiche Routen, kompakte Beschriftung */
export const bottomNavigation: NavEintrag[] = sidebarNavigation;
