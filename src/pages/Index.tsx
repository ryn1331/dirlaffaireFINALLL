import { lazy, Suspense } from "react";
import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import { TrendingUp, Flame, Sparkles, Heart, Shield, Moon, Zap } from "lucide-react";

const FeaturedSection = lazy(() => import("@/components/home/FeaturedSection"));
const TrustBadges = lazy(() => import("@/components/home/TrustBadges"));

const SectionFallback = () => <div className="container py-10 min-h-[200px]" aria-hidden="true" />;

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <CategoryGrid />

      <Suspense fallback={<SectionFallback />}>
        <FeaturedSection type="top" title="Les plus demandés" subtitle="Best-sellers" icon={<TrendingUp size={18} />} />

        <div className="bg-secondary/20">
          <FeaturedSection type="promo" title="Offres du moment" subtitle="Promotions" icon={<Flame size={18} />} />
        </div>

        <FeaturedSection type="beauty" title="Beauté & Cosmétiques" subtitle="Sélection beauté" icon={<Heart size={18} />} />

        <div className="bg-secondary/20">
          <FeaturedSection type="category" category="immunite" title="Immunité & Vitalité" subtitle="Sélection santé" icon={<Shield size={18} />} />
        </div>

        <FeaturedSection type="category" category="stress" title="Stress & Sommeil" icon={<Moon size={18} />} />

        <div className="bg-secondary/20">
          <FeaturedSection type="category" category="energie" title="Énergie & Vitalité" icon={<Zap size={18} />} />
        </div>

        <FeaturedSection type="new" title="Nouveautés" subtitle="Derniers arrivages" icon={<Sparkles size={18} />} limit={4} />

        <TrustBadges />
      </Suspense>
    </div>
  );
};

export default Index;
