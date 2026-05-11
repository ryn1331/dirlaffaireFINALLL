import { ArrowRight, MessageCircle } from "lucide-react";
import heroBg from "@/assets/hero-lifestyle-1280.webp";
import heroBgMobile from "@/assets/hero-lifestyle-768.webp";
import { MESSENGER_URL } from "@/lib/messenger";

export default function HeroSection() {
  const scrollToCategories = () => {
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden min-h-[320px] md:min-h-[480px]" aria-label="Bannière principale">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          srcSet={`${heroBgMobile} 768w, ${heroBg} 1280w`}
          sizes="(max-width: 768px) 100vw, 1280px"
          alt=""
          role="presentation"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          width={1280}
          height={720}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-foreground/5" />
      </div>

      <div className="container relative z-10 pt-16 pb-12 md:pt-28 md:pb-24 flex flex-col items-center text-center">
        <p className="text-background/50 text-xs md:text-sm uppercase tracking-[0.2em] font-body font-medium mb-4">
          Santé · Beauté · Bien-être
        </p>

        <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-background leading-[1.1] mb-4 md:mb-5 max-w-lg md:max-w-2xl">
          Prenez soin de vous,{" "}
          <span className="italic text-accent">naturellement</span>
        </h1>

        <p className="text-background/60 text-sm md:text-base mb-8 max-w-md font-body leading-relaxed">
          Compléments alimentaires & cosmétiques premium, livrés partout en Algérie
        </p>

        <div className="flex gap-3 w-full max-w-xs md:max-w-sm">
          <button
            onClick={scrollToCategories}
            className="flex-1 h-12 font-body text-sm font-semibold bg-background text-foreground rounded-full flex items-center justify-center gap-2 active:scale-[0.97] transition-all hover:bg-background/90 shadow-lg"
          >
            Découvrir
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <a
            href={MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 px-5 font-body text-sm font-medium rounded-full bg-background/10 backdrop-blur-sm text-background border border-background/20 flex items-center justify-center gap-2 active:scale-[0.97] transition-all hover:bg-background/20"
            aria-label="Contacter sur Messenger"
          >
            <MessageCircle size={15} aria-hidden="true" />
            Contact
          </a>
        </div>
      </div>
    </section>
  );
}
