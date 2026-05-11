import { useParams, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { ShoppingCart, Star, ChevronLeft, Check, Loader2, Truck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import OrderForm from "@/components/product/OrderForm";
import UrgencyBadges from "@/components/product/UrgencyBadges";
import ComplementaryProducts from "@/components/product/ComplementaryProducts";
import { formatPrice, getStorageUrl, type DbProduct } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { trackViewContent, trackAddToCart } from "@/lib/metaPixel";

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { t } = useLang();
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [selectedWeight, setSelectedWeight] = useState("");
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const { data: product, isLoading: loading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase.from("products_public").select("*").eq("id", id!).single();
      return (data as unknown as DbProduct) || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  const { data: similar = [] } = useQuery({
    queryKey: ["similar", product?.category, id],
    queryFn: async () => {
      const { data } = await supabase.from("products_public").select("*").eq("category", product!.category).neq("id", id!).limit(4);
      return (data as unknown as DbProduct[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!product?.category && !!id,
  });

  useEffect(() => {
    setSelectedImageIdx(0);
    setQty(1);
    setActiveTab("description");
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (product) {
      trackViewContent({ id: product.id, name: product.name, price: product.price, category: product.category });
    }
  }, [product]);

  if (loading) return <div className="container py-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground mb-4">{t("product.notFound")}</p>
        <Link to="/catalogue" className="text-primary hover:underline">{t("product.backToCatalog")}</Link>
      </div>
    );
  }

  const flavors = product.flavors || [];
  const weights = product.weights || [];
  const flavor = selectedFlavor || flavors[0] || "";
  const weight = selectedWeight || weights[0] || "";
  const nutritionFacts = (product.nutrition_facts as any[] || []);
  const usageInstructions = (product as any).usage_instructions || "";
  const conseils = (product as any).conseils || "";

  const tabs = [
    { key: "description", label: t("product.description") },
    { key: "usage", label: t("product.usage") },
    { key: "conseils", label: t("product.conseils") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-4 md:py-8">
        <Link to="/catalogue" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft size={16} /> {t("product.back")}
        </Link>

        <div className="grid md:grid-cols-2 gap-8 md:gap-14">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-secondary/30 border border-border/50">
              <img
                src={getStorageUrl(
                  selectedImageIdx === 0
                    ? product.image_url
                    : ((product as any).gallery || [])[selectedImageIdx - 1],
                  600
                )}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                width={600}
                height={600}
              />
            </div>
            {(() => {
              const gallery: string[] = (product as any).gallery || [];
              const allImages = [product.image_url, ...gallery].filter(Boolean);
              if (allImages.length <= 1) return null;
              return (
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${selectedImageIdx === idx ? "border-foreground" : "border-border/50 hover:border-foreground/30"}`}
                    >
                      <img src={getStorageUrl(img, 80)} alt="" className="w-full h-full object-cover" loading="lazy" width={64} height={64} />
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex gap-2 mb-3">
              {product.is_top_sale && <span className="badge-top">Populaire</span>}
              {product.is_promo && <span className="badge-promo">Promo</span>}
            </div>
            <p className="text-sm text-muted-foreground font-body">{product.brand}</p>
            <h1 className="font-heading text-2xl md:text-4xl font-bold mt-1 mb-3 text-foreground leading-tight">{product.name}</h1>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className={i < Math.round(product.rating || 0) ? "fill-accent text-accent" : "text-border"} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">({product.reviews_count || 0} {t("product.reviews")})</span>
            </div>

            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-heading font-bold text-3xl text-foreground">{formatPrice(product.price)}</span>
              {product.old_price && <span className="text-lg text-muted-foreground line-through">{formatPrice(product.old_price)}</span>}
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed font-body">{product.description}</p>

            {flavors.length > 0 && (
              <div className="mb-5">
                <label className="text-xs font-body font-medium uppercase tracking-[0.12em] text-muted-foreground mb-2.5 block">Saveur</label>
                <div className="flex flex-wrap gap-2">
                  {flavors.map((f) => (
                    <button key={f} onClick={() => setSelectedFlavor(f)} className={`px-4 py-2 rounded-full text-sm font-body transition-all ${flavor === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-muted"}`}>{f}</button>
                  ))}
                </div>
              </div>
            )}

            {weights.length > 0 && (
              <div className="mb-5">
                <label className="text-xs font-body font-medium uppercase tracking-[0.12em] text-muted-foreground mb-2.5 block">Poids</label>
                <div className="flex flex-wrap gap-2">
                  {weights.map((w) => (
                    <button key={w} onClick={() => setSelectedWeight(w)} className={`px-4 py-2 rounded-full text-sm font-body transition-all ${weight === w ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-muted"}`}>{w}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="text-xs font-body font-medium uppercase tracking-[0.12em] text-muted-foreground mb-2.5 block">{t("product.quantity")}</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-medium hover:bg-muted transition-colors text-foreground">−</button>
                <span className="font-body font-medium text-lg w-8 text-center">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-medium hover:bg-muted transition-colors text-foreground">+</button>
              </div>
            </div>

            <UrgencyBadges product={product} />

            {product.expiration_date && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15 mb-4">
                <span className="text-xs font-medium text-muted-foreground">🗓️ Date de péremption :</span>
                <span className="text-sm font-bold text-foreground">{new Date(product.expiration_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-sm mb-6">
              {product.in_stock ? (
                <><Check size={14} className="text-primary" /><span className="text-primary font-medium">{t("product.inStock")}</span></>
              ) : (
                <span className="text-destructive font-medium">{t("product.outOfStock")}</span>
              )}
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                onClick={() => setShowOrderForm(true)}
                disabled={!product.in_stock}
                className="flex-1 h-12 font-body text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-full"
              >
                {t("product.orderNow")}
              </Button>
              <Button
                onClick={() => {
                  addItem(product, flavor, weight, qty);
                  trackAddToCart({ id: product.id, name: product.name, price: product.price }, qty);
                }}
                disabled={!product.in_stock}
                variant="outline"
                className="h-12 px-5 rounded-full border-foreground/20 text-foreground hover:bg-secondary"
              >
                <ShoppingCart size={18} />
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck size={16} className="text-primary" />
                <span>{t("product.trustCod")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone size={16} className="text-primary" />
                <span>{t("product.trustAdvice")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 md:mt-20">
          <div className="flex gap-1 border-b border-border/50 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3.5 text-sm font-body font-medium transition-colors relative whitespace-nowrap ${activeTab === tab.key ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="py-8">
            {activeTab === "description" && (
              <div className="prose prose-sm max-w-none text-muted-foreground font-body">
                <p>{product.description || t("product.descriptionTBD")}</p>
                {nutritionFacts.length > 0 && (
                  <div className="mt-6 p-5 rounded-2xl bg-card border border-border/50">
                    <h3 className="font-heading font-semibold mb-3 text-sm text-foreground">{t("product.nutrition")}</h3>
                    <div className="space-y-2">
                      {nutritionFacts.map((fact: any) => (
                        <div key={fact.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{fact.label}</span>
                          <span className="font-medium text-foreground">{fact.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "usage" && (
              <div className="prose prose-sm max-w-none text-muted-foreground font-body">
                {usageInstructions ? (
                  <p className="whitespace-pre-line">{usageInstructions}</p>
                ) : (
                  <p>{t("product.usageDefault")}</p>
                )}
              </div>
            )}
            {activeTab === "conseils" && (
              <div className="prose prose-sm max-w-none text-muted-foreground font-body">
                {conseils ? (
                  <p className="whitespace-pre-line">{conseils}</p>
                ) : (
                  <p>{t("product.conseilsDefault")}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <ComplementaryProducts product={product} />

        {similar.length > 0 && (
          <div className="mt-12 md:mt-16">
            <h2 className="font-heading text-lg md:text-2xl font-bold mb-5 text-foreground">{t("product.similar")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {similar.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOrderForm && product && (
          <OrderForm product={product} quantity={qty} onClose={() => setShowOrderForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
