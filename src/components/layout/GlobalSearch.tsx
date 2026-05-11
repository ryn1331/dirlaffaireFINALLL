import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getStorageUrl } from "@/types/database";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id,name,price,image_url,category")
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`)
      .eq("in_stock", true)
      .limit(6);
    setResults((data as SearchResult[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(query), 300);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, search]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => { setOpen(false); setQuery(""); setResults([]); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full bg-secondary/60 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors min-w-[200px]"
        aria-label="Rechercher"
      >
        <Search size={14} />
        <span className="font-body">Rechercher...</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
              onClick={close}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-[61] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="flex-1 bg-transparent text-sm font-body text-foreground outline-none placeholder:text-muted-foreground"
                  maxLength={100}
                />
                {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                <button onClick={close} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>

              {results.length > 0 && (
                <div className="max-h-80 overflow-y-auto p-2">
                  {results.map((p) => (
                    <Link
                      key={p.id}
                      to={`/produit/${p.id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-secondary/40 overflow-hidden shrink-0">
                        <img src={getStorageUrl(p.image_url, 80)} alt="" className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.category}</p>
                      </div>
                      <span className="text-xs font-heading font-bold text-foreground shrink-0">
                        {formatPrice(p.price)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {query.length >= 2 && !loading && results.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Aucun produit trouvé</p>
                </div>
              )}

              {query.length >= 2 && results.length > 0 && (
                <div className="border-t border-border px-4 py-2.5">
                  <Link
                    to={`/catalogue?q=${encodeURIComponent(query)}`}
                    onClick={close}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Voir tous les résultats →
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
