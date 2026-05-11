import { Truck, CreditCard, ShieldCheck, Phone } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function TrustBadges() {
  const { t } = useLang();

  const badges = [
    { icon: Truck, title: t("trust.delivery"), desc: t("trust.deliveryDesc") },
    { icon: CreditCard, title: t("trust.cod"), desc: t("trust.codDesc") },
    { icon: ShieldCheck, title: t("trust.original"), desc: t("trust.originalDesc") },
    { icon: Phone, title: t("trust.support"), desc: t("trust.supportDesc") },
  ];

  return (
    <section className="py-10 md:py-16 bg-secondary/30" aria-label="Nos garanties">
      <div className="container">
        <div className="text-center mb-6 md:mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-body mb-2">Nos engagements</p>
          <h2 className="font-heading text-lg md:text-2xl font-bold text-foreground">Pourquoi nous faire confiance</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" role="list">
          {badges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                role="listitem"
                className="flex flex-col items-center text-center gap-3 bg-card rounded-2xl p-5 md:p-6 border border-border/50"
              >
                <div className="w-11 h-11 rounded-full bg-primary/8 flex items-center justify-center" aria-hidden="true">
                  <Icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-body font-semibold text-xs md:text-sm text-foreground">{b.title}</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
