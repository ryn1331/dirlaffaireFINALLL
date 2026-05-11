import { Home, Search, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { motion } from "framer-motion";

export default function MobileNav() {
  const location = useLocation();
  const { itemCount, setIsOpen } = useCart();
  const { t } = useLang();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/" },
    { icon: Search, label: t("nav.catalog"), path: "/catalogue" },
    { icon: ShoppingCart, label: t("nav.cart"), path: "__cart__" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isCart = item.path === "__cart__";
          const isActive = !isCart && location.pathname === item.path;
          const Icon = item.icon;

          if (isCart) {
            return (
              <button key={item.label} onClick={() => setIsOpen(true)} className="flex flex-col items-center gap-1 relative">
                <div className="relative">
                  <Icon size={20} className="text-muted-foreground" />
                  {itemCount > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2.5 w-4.5 h-4.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center min-w-[18px]">
                      {itemCount}
                    </motion.span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.label} to={item.path} className="flex flex-col items-center gap-1">
              <Icon size={20} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <span className={`text-[10px] ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>{item.label}</span>
              {isActive && <motion.div layoutId="nav-indicator" className="absolute top-0 w-8 h-0.5 rounded-full gradient-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
