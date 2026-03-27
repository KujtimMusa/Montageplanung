import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofStrip } from "@/components/landing/SocialProofStrip";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { FeatureSpotlight } from "@/components/landing/FeatureSpotlight";
import { EchtzeitSection } from "@/components/landing/EchtzeitSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

/**
 * Öffentliche Startseite — Marketing-Landing (Dark, Motion, shadcn).
 * Session: Middleware leitet eingeloggte Nutzer von / nach /dashboard.
 */
export default function Startseite() {
  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-zinc-100 antialiased selection:bg-blue-500/30">
      <Navbar />
      <main>
        <HeroSection />
        <SocialProofStrip />
        <FeaturesGrid />
        <FeatureSpotlight />
        <EchtzeitSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
