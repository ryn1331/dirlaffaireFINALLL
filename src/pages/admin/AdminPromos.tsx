import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/types/database";
import type { DbProduct } from "@/types/database";
import { Tags, Plus, Edit, Trash2, Calendar, Percent, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Promo {
  id: string;
  name: string;
  discount: number;
  discount_type: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  products_count: number | null;
  apply_to: string;
  product_ids: string[];
  created_at: string;
  updated_at: string;
}

export default function AdminPromos() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [form, setForm] = useState({ name: "", discount: 0, discount_type: "percentage", start_date: "", end_date: "", active: true, apply_to: "all", product_ids: [] as string[] });
  const [saving, setSaving] = useState(false);

  const loadPromos = async () => {
    const { data } = await supabase.from("promos").select("*").order("created_at", { ascending: false });
    setPromos((data as any) || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setProducts(data || []);
  };

  useEffect(() => { loadPromos(); loadProducts(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", discount: 0, discount_type: "percentage", start_date: "", end_date: "", active: true, apply_to: "all", product_ids: [] });
    setShowForm(true);
  };

  const openEdit = (p: Promo) => {
    setEditing(p);
    setForm({ name: p.name, discount: p.discount, discount_type: p.discount_type, start_date: p.start_date || "", end_date: p.end_date || "", active: p.active ?? true, apply_to: p.apply_to || "all", product_ids: p.product_ids || [] });
    setShowForm(true);
  };

  const toggleProduct = (id: string) => {
    setForm(f => ({
      ...f,
      product_ids: f.product_ids.includes(id) ? f.product_ids.filter(x => x !== id) : [...f.product_ids, id]
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.discount) { toast.error("Remplissez les champs"); return; }
    setSaving(true);
    const data: any = {
      name: form.name, discount: form.discount, discount_type: form.discount_type,
      start_date: form.start_date || null, end_date: form.end_date || null,
      active: form.active, apply_to: form.apply_to,
      product_ids: form.apply_to === "selected" ? form.product_ids : [],
      products_count: form.apply_to === "all" ? products.length : form.product_ids.length,
    };

    if (editing) {
      await supabase.from("promos").update(data).eq("id", editing.id);
      toast.success("Promo modifiée !");
    } else {
      await supabase.from("promos").insert(data);
      toast.success("Promo créée !");
    }
    setSaving(false);
    setShowForm(false);
    loadPromos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("promos").delete().eq("id", id);
    toast.success("Promo supprimée");
    loadPromos();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez vos promotions et flash sales</p>
        <button onClick={openAdd} className="h-10 px-4 rounded-md gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2"><Plus size={16} /> Nouvelle promo</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{editing ? "Modifier" : "Nouvelle"} promo</h3>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Nom *</label><input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" maxLength={100} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Réduction *</label><input type="number" value={form.discount} onChange={(e) => setForm(f => ({ ...f, discount: +e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <select value={form.discount_type} onChange={(e) => setForm(f => ({ ...f, discount_type: e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm">
                    <option value="percentage">Pourcentage (%)</option><option value="fixed">Montant fixe (DZD)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Date début</label><input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Date fin</label><input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
              </div>

              {/* Apply to selector */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Appliquer à</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, apply_to: "all" }))} className={`flex-1 h-10 rounded-md text-sm font-medium border transition-colors ${form.apply_to === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                    Tous les produits
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, apply_to: "selected" }))} className={`flex-1 h-10 rounded-md text-sm font-medium border transition-colors ${form.apply_to === "selected" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                    Sélection
                  </button>
                </div>
              </div>

              {form.apply_to === "selected" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Produits ({form.product_ids.length} sélectionnés)</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-md p-2 bg-secondary">
                    {products.map(p => (
                      <button key={p.id} type="button" onClick={() => toggleProduct(p.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${form.product_ids.includes(p.id) ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${form.product_ids.includes(p.id) ? "border-primary bg-primary" : "border-border"}`}>
                          {form.product_ids.includes(p.id) && <Check size={10} className="text-primary-foreground" />}
                        </div>
                        {p.name} <span className="text-muted-foreground ml-auto">{p.brand}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm py-1"><input type="checkbox" checked={form.active} onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-primary" /> Active</label>
              <button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-md gradient-primary text-primary-foreground font-heading font-bold">{saving ? "..." : editing ? "Modifier" : "Créer"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promos.map((promo, i) => (
          <motion.div key={promo.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Tags size={16} className="text-primary" /></div>
                <h3 className="font-heading font-bold text-sm">{promo.name}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${promo.active ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>{promo.active ? "Active" : "Inactive"}</span>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm"><Percent size={14} className="text-primary" /><span className="font-heading font-bold text-lg">{promo.discount_type === "percentage" ? `-${promo.discount}%` : `-${formatPrice(promo.discount)}`}</span></div>
              <div className="text-xs text-muted-foreground">
                {promo.apply_to === "all" ? "Sur tous les produits" : `${(promo.product_ids || []).length} produit(s) sélectionné(s)`}
              </div>
              {promo.start_date && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar size={12} />{promo.start_date} → {promo.end_date}</div>}
            </div>
            <div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
              <button onClick={() => openEdit(promo)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"><Edit size={14} /></button>
              <button onClick={() => handleDelete(promo.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
            </div>
          </motion.div>
        ))}
        {promos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Aucune promo</p>}
      </div>
    </div>
  );
}
