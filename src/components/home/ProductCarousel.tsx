import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl, formatPrice, type DbProduct } from "@/types/database";
import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCarouselProps {
  category: string;
  titleKey: string;
}

export default function ProductCarousel({ category, titleKey }: ProductCarouselProps) {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,brand,category,price,old_price,image_url,rating,reviews_count,is_promo,is_top_sale,in_stock,stock_qty")
      .eq("category", category)
      .eq("in_stock", true)
      .limit(10)
      .then(({ data }) => setProducts((data as DbProduct[]) || []));
  }, [category]);

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">{t(titleKey)}</h2>
          <div className="flex items-center gap-2">
            <Link to={`/catalogue?cat=${category}`} className="text-sm font-medium text-primary hover:underline me-2">
              {t("section.viewAll")}
            </Link>
            <button onClick={() => scroll("left")} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors" aria-label="Défiler à gauche">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll("right")} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors" aria-label="Défiler à droite">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {products.map((p) => (
            <div key={p.id} className="snap-start">
              <Link
                to={`/produit/${p.id}`}
                className="block w-[200px] md:w-[220px] shrink-0 rounded-xl border border-border bg-card overflow-hidden card-hover group"
              >
                <div className="aspect-square bg-secondary/50 overflow-hidden">
                  <img
                    src={getStorageUrl(p.image_url, 300)}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    width={220}
                    height={220}
                  />
                </div>
                <div className="p-3">
                  {p.objectives && p.objectives.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.objectives.slice(0, 2).map(obj => (
                        <span key={obj} className="badge-category">{obj}</span>
                      ))}
                    </div>
                  )}
                  <h3 className="font-heading font-semibold text-sm text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
                    {p.name}
                  </h3>
                  <p className="font-heading font-bold text-accent text-base mt-2">
                    {formatPrice(p.price)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
