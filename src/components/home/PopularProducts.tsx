import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct } from "@/types/database";
import ProductCard from "@/components/product/ProductCard";
import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function PopularProducts() {
  const { t } = useLang();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["popular-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_top_sale", true).limit(4);
      return (data as DbProduct[]) || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="container py-10 md:py-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-lg md:text-2xl font-bold">{t("popular.title")} <span className="text-primary">{t("popular.highlight")}</span></h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">{t("popular.sub")}</p>
          </div>
        </div>
        <Link to="/catalogue" className="text-xs text-primary flex items-center gap-1 hover:underline font-medium">
          {t("popular.viewAll")} <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="snap-start shrink-0 w-[160px] md:w-auto"><ProductCardSkeleton /></div>
            ))
          : products.map((product, i) => (
              <div key={product.id} className="snap-start shrink-0 w-[160px] md:w-auto">
                <ProductCard product={product} index={i} />
              </div>
            ))
        }
      </div>
    </section>
  );
}
