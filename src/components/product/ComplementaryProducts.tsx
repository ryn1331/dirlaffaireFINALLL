import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { formatPrice, getStorageUrl, type DbProduct } from "@/types/database";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const COMPLEMENTS: Record<string, string[]> = {
  muscles: ["immunite", "os", "coeur"],
  beaute: ["immunite", "stress", "hormones"],
  cerveau: ["stress", "immunite", "coeur"],
  stress: ["cerveau", "beaute", "immunite"],
  os: ["muscles", "immunite", "coeur"],
  coeur: ["os", "immunite", "cerveau"],
  immunite: ["coeur", "stress", "beaute"],
  hormones: ["beaute", "stress", "muscles"],
  "perte-de-poids": ["muscles", "immunite", "coeur"],
};

interface Props {
  product: DbProduct;
}

export default function ComplementaryProducts({ product }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cats = COMPLEMENTS[product.category] || [];

  const { data: products = [] } = useQuery({
    queryKey: ["complementary", product.id, product.category],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,brand,category,price,old_price,image_url,rating,reviews_count,is_promo,is_top_sale,in_stock")
        .in("category", cats)
        .neq("id", product.id)
        .eq("in_stock", true)
        .limit(8);
      return (data as DbProduct[]) || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: cats.length > 0,
  });

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section className="mt-10 md:mt-14" aria-label="Produits complémentaires">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-heading text-base md:text-xl font-bold text-foreground">
            Complète ton programme 💪
          </h2>
          <p className="text-[11px] md:text-sm text-muted-foreground mt-0.5">
            Ces produits se marient parfaitement avec ta sélection
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <button onClick={() => scroll("left")} aria-label="Défiler à gauche" className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button onClick={() => scroll("right")} aria-label="Défiler à droite" className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible"
        role="list"
      >
        {products.map((p) => {
          const discount = p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 0;
          return (
            <article
              key={p.id}
              role="listitem"
              className="snap-start shrink-0 w-[44vw] sm:w-[42vw] md:w-auto"
            >
              <Link
                to={`/produit/${p.id}`}
                className="group block rounded-2xl border border-border bg-card overflow-hidden card-hover relative"
                aria-label={`${p.name} — ${formatPrice(p.price)}`}
              >
                {discount > 0 && (
                  <span className="absolute top-2 left-2 z-10 badge-promo text-[10px]">-{discount}%</span>
                )}
                <div className="aspect-square overflow-hidden bg-gradient-to-br from-secondary to-mint">
                  <img
                    src={getStorageUrl(p.image_url, 300)}
                    alt={p.name}
                    className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width={300}
                    height={300}
                  />
                </div>
                <div className="p-2.5 md:p-3.5">
                  <h3 className="font-heading font-semibold text-xs md:text-sm leading-tight line-clamp-2 min-h-[2rem] md:min-h-[2.5rem] text-foreground">
                    {p.name}
                  </h3>
                  {p.rating && p.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={10} className="fill-accent text-accent" aria-hidden="true" />
                      <span className="text-[10px] font-medium text-foreground">{Number(p.rating).toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="font-heading font-bold text-accent text-sm md:text-base">{formatPrice(p.price)}</span>
                    {p.old_price && (
                      <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.old_price)}</span>
                    )}
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
