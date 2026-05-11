import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getStorageUrl, type DbProduct } from "@/types/database";
import { useLang } from "@/context/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Star, Truck, ShieldCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderForm from "@/components/product/OrderForm";
import { AnimatePresence } from "framer-motion";
import { trackViewContent } from "@/lib/metaPixel";
import { useEffect } from "react";
import { MESSENGER_URL } from "@/lib/messenger";

export default function LandingPage() {
  const { slug } = useParams();
  const { t } = useLang();
  const { data: settings } = useSiteSettings();
  const storeName = settings?.store_name || "Vitaluxyne";
  const [showOrderForm, setShowOrderForm] = useState(false);

  const { data: product, isLoading: loading } = useQuery({
    queryKey: ["landing-product", slug],
    queryFn: async () => {
      let { data } = await supabase.from("products_public").select("*").eq("id", slug!).maybeSingle();
      if (!data) {
        const slugClean = (slug || "").replace(/-/g, "%");
        const { data: matched } = await supabase.from("products_public").select("*").ilike("name", `%${slugClean}%`).limit(1);
        data = matched?.[0] || null;
      }
      return (data as unknown as DbProduct) || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });

  useEffect(() => {
    if (product) trackViewContent({ id: product.id, name: product.name, price: product.price, category: product.category });
  }, [product]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Produit non trouvé</p>
          <Link to="/" className="text-primary hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  const scrollToOrder = () => setShowOrderForm(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="font-heading text-lg font-bold text-primary">{storeName}</Link>
          <Button onClick={scrollToOrder} size="sm" className="bg-primary text-primary-foreground rounded-full font-heading text-xs h-9 px-4">
            {t("landing.orderNow")}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-8 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="aspect-square rounded-2xl overflow-hidden bg-secondary/50 border border-border max-w-md mx-auto md:mx-0">
            <img src={getStorageUrl(product.image_url, 600)} alt={product.name} className="w-full h-full object-cover" loading="eager" fetchPriority="high" width={600} height={600} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
            <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-4">{product.name}</h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} className={i < Math.round(product.rating || 4) ? "fill-accent text-accent" : "text-muted"} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.reviews_count || 0} avis)</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-heading font-bold text-3xl md:text-4xl text-accent">{formatPrice(product.price)}</span>
              {product.old_price && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.old_price)}</span>}
            </div>

            <p className="text-muted-foreground mb-6 leading-relaxed">{product.description}</p>

            {/* Benefits */}
            <div className="space-y-2 mb-8">
              {(product.objectives || []).slice(0, 4).map(obj => (
                <div key={obj} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-xs">✓</span>
                  </div>
                  <span className="text-foreground">{obj}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={scrollToOrder} size="lg" className="h-12 px-8 font-heading text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg shadow-primary/20 flex-1">
                {t("landing.orderNow")}
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 font-heading text-base rounded-full border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2]/5">
                <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={18} className="me-2" />
                  {t("landing.messenger")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-secondary/50 py-8">
        <div className="container flex flex-wrap justify-center gap-8">
          {[
            { icon: Truck, text: "Livraison partout en Algérie" },
            { icon: ShieldCheck, text: "Produits 100% authentiques" },
            { icon: Phone, text: "Conseil gratuit par téléphone" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                <Icon size={18} className="text-primary" />
                <span className="font-medium">{item.text}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-primary py-10">
        <div className="container text-center">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-primary-foreground mb-4">Commandez maintenant</h2>
          <p className="text-primary-foreground/70 mb-6 text-sm">Livraison rapide · Paiement à la livraison · Conseil gratuit</p>
          <Button onClick={scrollToOrder} size="lg" className="h-12 px-10 font-heading text-base bg-accent text-accent-foreground hover:bg-accent/90 rounded-full">
            {t("landing.orderNow")}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground bg-background border-t border-border">
        © {new Date().getFullYear()} {storeName}. Tous droits réservés.
      </footer>

      {/* Order Form */}
      <AnimatePresence>
        {showOrderForm && <OrderForm product={product} quantity={1} onClose={() => setShowOrderForm(false)} />}
      </AnimatePresence>
    </div>
  );
}
