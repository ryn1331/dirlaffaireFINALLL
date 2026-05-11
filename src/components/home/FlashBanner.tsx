import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface ActivePromo {
  name: string;
  discount: number;
  discount_type: string;
  end_date: string | null;
}

export default function FlashBanner() {
  const { t } = useLang();
  const [promo, setPromo] = useState<ActivePromo | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    supabase.from("promos").select("name, discount, discount_type, end_date")
      .eq("active", true).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setPromo(data[0]);
      });
  }, []);

  useEffect(() => {
    if (!promo?.end_date) {
      // Fallback countdown
      setTimeLeft({ hours: 23, minutes: 59, seconds: 59 });
    } else {
      const end = new Date(promo.end_date + "T23:59:59").getTime();
      const calc = () => {
        const diff = Math.max(0, end - Date.now());
        const hours = Math.floor(diff / 3600000) % 24;
        const minutes = Math.floor(diff / 60000) % 60;
        const seconds = Math.floor(diff / 1000) % 60;
        setTimeLeft({ hours, minutes, seconds });
      };
      calc();
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [promo]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const promoText = promo
    ? `${promo.name} — ${promo.discount_type === "percentage" ? `-${promo.discount}%` : `-${promo.discount} DZD`}`
    : t("flash.title");

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-y border-primary/20">
      <div className="container py-3 flex items-center justify-center gap-3 text-sm">
        <Zap size={16} className="text-primary animate-pulse" />
        <span className="font-heading font-bold text-primary">{promoText}</span>
        <span className="text-muted-foreground">{t("flash.ends")}</span>
        <div className="flex items-center gap-1 font-mono font-bold">
          {[pad(timeLeft.hours), pad(timeLeft.minutes), pad(timeLeft.seconds)].map((v, i) => (
            <span key={i} className="flex items-center">
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">{v}</span>
              {i < 2 && <span className="text-primary/50 mx-0.5">:</span>}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
