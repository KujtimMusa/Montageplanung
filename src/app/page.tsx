import { LandingPage } from "@/components/landing/LandingPage";

/**
 * Öffentliche Startseite — statisch, ohne Supabase.
 * Session: Middleware leitet eingeloggte Nutzer von / nach /dashboard.
 */
export default function Startseite() {
  return <LandingPage />;
}
