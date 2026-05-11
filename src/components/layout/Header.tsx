import { ShoppingCart, Search, Menu, X, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalSearch from "./GlobalSearch";

export default function Header() {
  const { itemCount, setIsOpen } = useCart();
  const { t, lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50" role="banner">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">
        Aller au contenu principal
      </a>
      <div className="container flex items-center justify-between h-14 md:h-16">
        <Link to="/" className="flex items-center gap-2" aria-label="Dir l'Affaire - Accueil">
          <span className="font-heading text-lg md:text-xl font-bold tracking-tight text-foreground">
            Dir l'Affaire
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Navigation principale">
          <Link to="/catalogue?univers=beaute" className="text-muted-foreground hover:text-foreground transition-colors">Beauté</Link>
          <Link to="/catalogue?univers=sante" className="text-muted-foreground hover:text-foreground transition-colors">Santé</Link>
        </nav>

        <GlobalSearch />

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/catalogue")}
            className="p-2.5 text-muted-foreground hover:text-foreground transition-colors md:hidden"
            aria-label="Rechercher des produits"
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
            className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={lang === "fr" ? "Passer à l'arabe" : "Switch to French"}
          >
            <Globe size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
          >
            <ShoppingCart size={18} aria-hidden="true" />
            {itemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {itemCount}
              </motion.span>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 text-muted-foreground"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border/50"
          >
            <nav className="container py-4 flex flex-col gap-0.5" aria-label="Navigation mobile">
              {[
                { to: "/catalogue?univers=beaute", label: "Beauté & Cosmétiques" },
                { to: "/catalogue?univers=sante", label: "Santé & Compléments" },
              ].map(link => (
                <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="py-3 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
