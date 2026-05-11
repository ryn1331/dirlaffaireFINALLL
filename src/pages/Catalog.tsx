import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/context/LanguageContext";
import ProductCard from "@/components/product/ProductCard";
import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";
import { Loader2, Search, ArrowLeft } from "lucide-react";
import type { DbProduct } from "@/types/database";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

const beauteCategories = [
  { key: "all", fr: "Tout Beauté", ar: "كل الجمال" },
  { key: "soins-visage", fr: "Soins du visage", ar: "العناية بالوجه" },
  { key: "soins-corps", fr: "Soins du corps", ar: "العناية بالجسم" },
  { key: "cheveux", fr: "Cheveux", ar: "الشعر" },
  { key: "ongles", fr: "Ongles", ar: "الأظافر" },
  { key: "anti-age", fr: "Anti-âge", ar: "مكافحة الشيخوخة" },
  { key: "collagene", fr: "Collagène", ar: "الكولاجين" },
  { key: "eclat-teint", fr: "Éclat & Teint", ar: "نضارة البشرة" },
];

const santeCategories = [
  { key: "all", fr: "Tout Santé", ar: "كل الصحة" },
  { key: "immunite", fr: "Immunité", ar: "المناعة" },
  { key: "stress", fr: "Stress & Sommeil", ar: "التوتر والنوم" },
  { key: "energie", fr: "Énergie", ar: "الطاقة" },
  { key: "cerveau", fr: "Cerveau & Focus", ar: "الدماغ والتركيز" },
  { key: "muscles", fr: "Muscles", ar: "العضلات" },
  { key: "os", fr: "Os & Articulations", ar: "العظام والمفاصل" },
  { key: "coeur", fr: "Cœur", ar: "القلب" },
  { key: "hormones", fr: "Hormones", ar: "الهرمونات" },
  { key: "perte-de-poids", fr: "Perte de poids", ar: "فقدان الوزن" },
  { key: "detox", fr: "Détox", ar: "إزالة السموم" },
  { key: "digestion", fr: "Digestion", ar: "الهضم" },
  { key: "multivitamines", fr: "Multivitamines", ar: "فيتامينات متعددة" },
];

// No generic catalog — always redirect to a universe

type SortOption = "newest" | "price-asc" | "price-desc" | "popular";

const Catalog = React.forwardRef<HTMLDivElement>(function Catalog(_, ref) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const { t, lang } = useLang();

  const universe = searchParams.get("univers") || "beaute";
  const activeCategory = searchParams.get("cat") || "all";

  const categoryList = useMemo(() => {
    if (universe === "beaute") return beauteCategories;
    return santeCategories;
  }, [universe]);

  const pageTitle = universe === "beaute" 
    ? (lang === "ar" ? "الجمال ومستحضرات التجميل" : "Beauté & Cosmétiques") 
    : (lang === "ar" ? "الصحة والمكملات" : "Santé & Compléments");
  const pageSubtitle = universe === "beaute" 
    ? (lang === "ar" ? "مجموعة الجمال" : "Collection beauté") 
    : (lang === "ar" ? "مجموعة الصحة" : "Collection santé");

  const fetchProducts = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    
    let query = supabase.from("products")
      .select("id,name,brand,category,price,old_price,image_url,rating,reviews_count,is_promo,is_top_sale,in_stock,stock_qty")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    } else if (universe === "beaute") {
      query = query.in("category", ["soins-visage", "soins-corps", "cheveux", "ongles", "anti-age", "collagene", "eclat-teint"]);
    } else if (universe === "sante") {
      query = query.in("category", ["immunite", "stress", "energie", "cerveau", "os", "coeur", "hormones", "perte-de-poids", "muscles", "digestion", "detox", "multivitamines", "antioxydants"]);
    }

    const { data } = await query;
    const newProducts = (data || []) as DbProduct[];
    
    if (append) {
      setProducts(prev => [...prev, ...newProducts]);
    } else {
      setProducts(newProducts);
    }
    setHasMore(newProducts.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [activeCategory, universe]);

  useEffect(() => {
    setHasMore(true);
    fetchProducts(0, false);
  }, [fetchProducts]);

  const loadMore = () => {
    fetchProducts(products.length, true);
  };

  const filtered = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }

    switch (sort) {
      case "price-asc": result = [...result].sort((a, b) => a.price - b.price); break;
      case "price-desc": result = [...result].sort((a, b) => b.price - a.price); break;
      case "popular": result = [...result].sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0)); break;
      default: break;
    }

    return result;
  }, [products, search, sort]);

  const setCategory = (cat: string) => {
    if (cat === "all") {
      searchParams.delete("cat");
    } else {
      searchParams.set("cat", cat);
    }
    setSearchParams(searchParams);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 md:py-12">
        <div className="mb-8"><div className="h-8 w-48 bg-muted animate-pulse rounded-lg" /></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 md:py-12">
         <div className="mb-8">
          {universe && (
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              {lang === "ar" ? "العودة للرئيسية" : "Retour à l'accueil"}
            </button>
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-body mb-2">{pageSubtitle}</p>
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground">{pageTitle}</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-6 -mx-1 px-1">
          {categoryList.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-body font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat[lang]}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("catalog.search")}
              className="w-full h-11 rounded-full bg-card border border-border/60 pl-10 pr-4 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20"
              maxLength={100}
              aria-label={t("catalog.search")}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-11 rounded-full bg-card border border-border/60 px-4 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Trier les produits"
          >
            <option value="newest">{t("catalog.sortNewest")}</option>
            <option value="price-asc">{t("catalog.sortPriceAsc")}</option>
            <option value="price-desc">{t("catalog.sortPriceDesc")}</option>
            <option value="popular">{t("catalog.sortPopular")}</option>
          </select>
        </div>

        <p className="text-sm text-muted-foreground mb-5 font-body">{filtered.length} {t("catalog.results")}</p>

        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
            {hasMore && !search.trim() && (
              <div className="flex justify-center mt-10">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="rounded-full px-8 font-body border-foreground/20 hover:bg-secondary"
                >
                   {loadingMore ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                   {lang === "ar" ? "عرض المزيد" : "Voir plus"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Search size={48} className="text-muted-foreground/20 mx-auto mb-4" />
            <p className="font-heading text-lg font-semibold text-foreground mb-2">{t("catalog.noResults")}</p>
            <p className="text-sm text-muted-foreground font-body">{lang === "ar" ? "جرب فئة أو كلمة بحث أخرى." : "Essayez une autre catégorie ou un autre terme de recherche."}</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default Catalog;
