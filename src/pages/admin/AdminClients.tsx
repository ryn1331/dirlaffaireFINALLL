import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/types/database";
import type { DbClient } from "@/types/database";
import { Search, MapPin, Phone, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminClients() {
  const [clients, setClients] = useState<DbClient[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("clients").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setClients(data || []));
  }, []);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.wilaya || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un client..." className="w-full h-10 rounded-md bg-card border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" maxLength={100} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-sm">{c.name.charAt(0)}</div>
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin size={10} /> {c.wilaya || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground mb-4">
              <p className="flex items-center gap-2"><Phone size={12} /> {c.phone}</p>
              {c.email && <p className="flex items-center gap-2"><Mail size={12} /> {c.email}</p>}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
              <span className="text-muted-foreground">{c.orders_count || 0} commandes</span>
              <span className="font-heading font-bold text-primary">{formatPrice(c.total_spent || 0)}</span>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Aucun client</p>}
      </div>
    </div>
  );
}
