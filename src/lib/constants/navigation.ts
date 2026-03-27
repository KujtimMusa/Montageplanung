import {
  Bell,
  Building2,
  CalendarDays,
  Contact,
  LayoutDashboard,
  Settings,
  Users,
  AlertTriangle,
  Briefcase,
  Truck,
  UserMinus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavEintrag = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Vollständige Desktop-Sidebar (Bauplan) */
export const sidebarNavigation: NavEintrag[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planung", label: "Planung", icon: CalendarDays },
  { href: "/projekte", label: "Projekte", icon: Briefcase },
  { href: "/mitarbeiter", label: "Mitarbeiter", icon: Users },
  { href: "/abteilungen", label: "Abteilungen", icon: Building2 },
  { href: "/kunden", label: "Kunden", icon: Contact },
  { href: "/abwesenheiten", label: "Abwesenheiten", icon: UserMinus },
  { href: "/dienstleister", label: "Dienstleister", icon: Truck },
  { href: "/notfall", label: "Notfall", icon: AlertTriangle },
  { href: "/benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

/** Mobile Bottom Navigation (4 Icons, Bauplan) */
export const bottomNavigation: NavEintrag[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planung", label: "Kalender", icon: CalendarDays },
  { href: "/mitarbeiter", label: "Mitarbeiter", icon: Users },
  { href: "/benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
];
