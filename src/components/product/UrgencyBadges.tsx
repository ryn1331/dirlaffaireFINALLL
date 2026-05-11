import { useState, useEffect } from "react";
import { Flame, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { DbProduct } from "@/types/database";

interface UrgencyBadgesProps {
  product: DbProduct;
}

export default function UrgencyBadges({ product }: UrgencyBadgesProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const stockQty = product.stock_qty ?? 0;
  const isLowStock = stockQty > 0 && stockQty <= 15;
  const isPromo = product.is_promo && product.old_price;

  // Fake promo timer — ends at midnight today
  useEffect(() => {
    if (!isPromo) return;
    const tick = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft("00:00:00"); return; }
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPromo]);

  if (!isLowStock && !isPromo) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {isLowStock && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <span className="text-xs font-medium text-destructive">
            Plus que <strong>{stockQty}</strong> en stock — commandez vite !
          </span>
        </motion.div>
      )}
      {isPromo && timeLeft && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20"
        >
          <Clock size={14} className="text-accent shrink-0" />
          <span className="text-xs font-medium text-foreground">
            Offre expire dans{" "}
            <span className="font-mono font-bold text-accent">{timeLeft}</span>
          </span>
          <Flame size={12} className="text-accent ml-auto animate-pulse" />
        </motion.div>
      )}
    </div>
  );
}
