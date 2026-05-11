import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { formatPrice, getStorageUrl } from "@/types/database";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, total, itemCount } = useCart();
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="bg-background border-border/50 w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl flex items-center gap-2 text-foreground">
            <ShoppingBag size={20} className="text-muted-foreground" aria-hidden="true" />
            {t("cart.title")} ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center font-body">{t("cart.empty")}</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.flavor}-${item.weight}`} className="flex gap-3 p-3 rounded-2xl bg-secondary/40 border border-border/50">
                  <img src={getStorageUrl(item.imageUrl, 80)} alt="" className="w-16 h-16 rounded-xl object-cover bg-muted" width={64} height={64} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-body font-medium text-sm truncate text-foreground">{item.name}</h4>
                    <p className="text-xs text-muted-foreground font-body">{item.flavor} · {item.weight}</p>
                    <p className="text-sm font-heading font-bold text-foreground mt-1">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.productId, item.flavor, item.weight, item.quantity - 1)} className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors" aria-label={`Diminuer la quantité de ${item.name}`}>
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <span className="text-sm font-body font-medium w-6 text-center" aria-live="polite">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.flavor, item.weight, item.quantity + 1)} className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors" aria-label={`Augmenter la quantité de ${item.name}`}>
                        <Plus size={14} aria-hidden="true" />
                      </button>
                      <button onClick={() => removeItem(item.productId, item.flavor, item.weight)} className="ms-auto text-muted-foreground hover:text-destructive transition-colors" aria-label={`Supprimer ${item.name} du panier`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-body">{t("cart.total")}</span>
                <span className="font-heading text-xl font-bold text-foreground" aria-live="polite">{formatPrice(total)}</span>
              </div>
              <Button onClick={() => { setIsOpen(false); navigate("/checkout"); }} className="w-full h-12 font-body text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-full">
                {t("cart.order")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
