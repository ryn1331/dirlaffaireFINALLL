import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/types/database";
import ProductCard from "@/components/product/ProductCard";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/context/LanguageContext";

export default function PromoSection() {
  const [promos, setPromos] = useState<DbProduct[]>([]);
  const { t } = useLang();

  useEffect(() => {
    supabase.from("products").select("*").eq("is_promo", true).limit(4)
      .then(({ data }) => setPromos(data || []));
  }, []);

  if (promos.length === 0) return null;

  return (
    <section className="bg-surface py-10 md:py-16">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Flame size={18} className="text-destructive" />
          </div>
          <div>
            <h2 className="font-heading text-lg md:text-2xl font-bold">{t("promo.title")} <span className="text-destructive">{t("promo.highlight")}</span></h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">{t("promo.sub")}</p>
          </div>
        </motion.div>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          {promos.map((product, i) => (
            <div key={product.id} className="snap-start shrink-0 w-[160px] md:w-auto">
              <ProductCard product={product} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
