import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, ShoppingCart, X, Package, Clock } from "lucide-react";
import { formatPrice, getStorageUrl, type PackWithItems } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/context/LanguageContext";

export default function PacksSection() {
  const [packs, setPacks] = useState<PackWithItems[]>([]);
  const [selectedPack, setSelectedPack] = useState<PackWithItems | null>(null);
  const { t } = useLang();

  useEffect(() => {
    supabase.from("packs").select("*, pack_items(*)").eq("active", true)
      .then(({ data }) => setPacks((data as any) || []));
  }, []);

  if (packs.length === 0) return null;

  return (
    <>
      <section className="container py-10 md:py-16">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Boxes size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-lg md:text-2xl font-bold">{t("packs.title")} <span className="text-primary">{t("packs.highlight")}</span></h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">{t("packs.sub")}</p>
          </div>
        </motion.div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {packs.map((pack, i) => (
            <motion.div key={pack.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedPack(pack)}
              className="snap-start shrink-0 w-[280px] md:w-auto bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 group cursor-pointer"
            >
              <div className="relative h-32 overflow-hidden product-image-bg">
                <img src={getStorageUrl(pack.image_url)} alt={pack.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <h3 className="font-heading font-bold text-base">{pack.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{pack.description}</p>
                </div>
                {pack.old_price && (
                  <div className="absolute top-3 right-3 badge-promo">-{Math.round((1 - pack.price / pack.old_price) * 100)}%</div>
                )}
              </div>
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  {(pack.pack_items || []).slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item.product_name} {item.quantity && item.quantity > 1 ? `x${item.quantity}` : ""}
                    </div>
                  ))}
                  {(pack.pack_items || []).length > 3 && (
                    <p className="text-[10px] text-primary">+{(pack.pack_items || []).length - 3} {t("packs.more") || "autres"}</p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <span className="font-heading font-bold text-primary text-lg">{formatPrice(pack.price)}</span>
                    {pack.old_price && <span className="text-xs text-muted-foreground line-through ms-2">{formatPrice(pack.old_price)}</span>}
                  </div>
                  <span className="text-xs text-primary font-medium">{t("packs.viewDetail") || "Voir détails →"}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pack Detail Modal */}
      <AnimatePresence>
        {selectedPack && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPack(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Pack image */}
              <div className="relative h-48 overflow-hidden rounded-t-2xl product-image-bg">
                <img src={getStorageUrl(selectedPack.image_url)} alt={selectedPack.name} className="w-full h-full object-contain p-4" />
                <button onClick={() => setSelectedPack(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
                {selectedPack.old_price && (
                  <div className="absolute top-3 left-3 badge-promo text-sm">-{Math.round((1 - selectedPack.price / selectedPack.old_price) * 100)}%</div>
                )}
              </div>

              <div className="p-6">
                <h2 className="font-heading font-bold text-xl mb-1">{selectedPack.name}</h2>
                {selectedPack.description && <p className="text-sm text-muted-foreground mb-4">{selectedPack.description}</p>}

                {(selectedPack as any).duration && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Clock size={14} className="text-primary" />
                    <span>Durée : {(selectedPack as any).duration}</span>
                  </div>
                )}

                {/* Pack items */}
                <div className="mb-6">
                  <h3 className="font-heading font-bold text-sm mb-3 flex items-center gap-2">
                    <Package size={14} className="text-primary" /> {t("packs.contains") || "Ce pack contient"}
                  </h3>
                  <div className="space-y-2">
                    {(selectedPack.pack_items || []).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-medium flex-1">{item.product_name}</span>
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">x{item.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <span className="font-heading font-bold text-primary text-2xl">{formatPrice(selectedPack.price)}</span>
                    {selectedPack.old_price && <span className="text-sm text-muted-foreground line-through ms-2">{formatPrice(selectedPack.old_price)}</span>}
                    {selectedPack.old_price && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        {t("packs.save") || "Vous économisez"} {formatPrice(selectedPack.old_price - selectedPack.price)}
                      </p>
                    )}
                  </div>
                  <button onClick={() => { toast.info(t("packs.whatsapp")); setSelectedPack(null); }} className="h-11 px-6 rounded-xl gradient-primary text-primary-foreground text-sm font-heading font-bold flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95">
                    <ShoppingCart size={16} /> {t("packs.order")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
