import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getStorageUrl, type DbProduct } from "@/types/database";
import { compressImage } from "@/lib/imageUtils";
import { Package, Plus, Search, Edit, Trash2, X, Upload, Loader2, Filter, Grid3X3, List, Link2, Minus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const defaultProduct = {
  name: "", brand: "", category: "immunite", universe: "sante" as "beaute" | "sante",
  price: 0, old_price: null as number | null,
  description: "", usage_instructions: "", conseils: "",
  flavors: [] as string[], weights: [] as string[],
  objectives: [] as string[], in_stock: true, is_top_sale: false, is_promo: false,
  image_url: null as string | null, stock_qty: 0, gallery: [] as string[],
  expiration_date: "" as string,
};

const categoryGroups = [
  {
    label: "🌸 Beauté & Cosmétiques",
    options: [
      { value: "soins-visage", label: "Soins du visage" },
      { value: "soins-corps", label: "Soins du corps" },
      { value: "cheveux", label: "Cheveux" },
      { value: "ongles", label: "Ongles" },
      { value: "anti-age", label: "Anti-âge" },
      { value: "collagene", label: "Collagène" },
      { value: "eclat-teint", label: "Éclat & Teint" },
    ],
  },
  {
    label: "💊 Santé & Compléments",
    options: [
      { value: "immunite", label: "Immunité" },
      { value: "stress", label: "Stress & Sommeil" },
      { value: "energie", label: "Énergie" },
      { value: "cerveau", label: "Cerveau & Focus" },
      { value: "muscles", label: "Muscles" },
      { value: "os", label: "Os & Articulations" },
      { value: "coeur", label: "Cœur" },
      { value: "hormones", label: "Hormones" },
      { value: "perte-de-poids", label: "Perte de poids" },
      { value: "detox", label: "Détox" },
      { value: "digestion", label: "Digestion" },
      { value: "multivitamines", label: "Multivitamines" },
    ],
  },
];

const beauteOptions = categoryGroups[0].options;
const santeOptions = categoryGroups[1].options;
const allBeauteSlugs = beauteOptions.map(o => o.value);
const categoryOptions = categoryGroups.flatMap(g => g.options);

function copyProductUrl(id: string) {
  const url = `${window.location.origin}/produit/${id}`;
  navigator.clipboard.writeText(url).then(() => toast.success("🔗 Lien produit copié !"));
}

export default function AdminProducts() {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [form, setForm] = useState(defaultProduct);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [flavorsInput, setFlavorsInput] = useState("");
  const [weightsInput, setWeightsInput] = useState("");
  const [objectivesInput, setObjectivesInput] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showStockModal, setShowStockModal] = useState<DbProduct | null>(null);
  const [stockDeduct, setStockDeduct] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const openAdd = () => {
    setEditing(null);
    setForm(defaultProduct);
    setFlavorsInput(""); setWeightsInput(""); setObjectivesInput("");
    setShowForm(true);
  };

  const openEdit = (p: DbProduct) => {
    setEditing(p);
    setForm({
      name: p.name, brand: p.brand, category: p.category,
      universe: allBeauteSlugs.includes(p.category) ? "beaute" : "sante",
      price: p.price, old_price: p.old_price,
      description: p.description || "",
      usage_instructions: (p as any).usage_instructions || "",
      conseils: (p as any).conseils || "",
      flavors: p.flavors || [], weights: p.weights || [],
      objectives: p.objectives || [], in_stock: p.in_stock ?? true,
      is_top_sale: p.is_top_sale ?? false, is_promo: p.is_promo ?? false,
      image_url: p.image_url, stock_qty: (p as any).stock_qty ?? 0,
      gallery: (p as any).gallery || [],
      expiration_date: (p as any).expiration_date || "",
    });
    setFlavorsInput((p.flavors || []).join(", "));
    setWeightsInput((p.weights || []).join(", "));
    setObjectivesInput((p.objectives || []).join(", "));
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { blob } = await compressImage(file, { maxWidth: 1200, quality: 0.82, format: "webp" });
      const mainPath = `products/${Date.now()}.webp`;
      const { error } = await supabase.storage.from("product-images").upload(mainPath, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, image_url: mainPath }));
      const sizeKB = Math.round(blob.size / 1024);
      toast.success(`Image principale compressée (${sizeKB} Ko) !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const { blob } = await compressImage(file, { maxWidth: 1200, quality: 0.82, format: "webp" });
          const path = `products/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.webp`;
          const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp", upsert: true });
          if (error) throw error;
          return path;
        })
      );
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...uploads] }));
      toast.success(`${uploads.length} photo(s) ajoutée(s) à la galerie !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'upload galerie");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.brand || !form.price) { toast.error("Remplissez les champs requis"); return; }
    setSaving(true);
    const data: any = {
      name: form.name, brand: form.brand, category: form.category, price: form.price,
      old_price: form.old_price || null,
      description: form.description || null,
      usage_instructions: form.usage_instructions || null,
      conseils: form.conseils || null,
      flavors: flavorsInput.split(",").map(s => s.trim()).filter(Boolean),
      weights: weightsInput.split(",").map(s => s.trim()).filter(Boolean),
      objectives: objectivesInput.split(",").map(s => s.trim()).filter(Boolean),
      in_stock: form.in_stock, is_top_sale: form.is_top_sale, is_promo: form.is_promo,
      image_url: form.image_url, stock_qty: form.stock_qty,
      gallery: form.gallery,
      expiration_date: form.expiration_date || null,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(data).eq("id", editing.id);
      if (error) { toast.error("Erreur"); setSaving(false); return; }
      toast.success("Produit modifié !");
    } else {
      const { error } = await supabase.from("products").insert(data);
      if (error) { toast.error("Erreur"); setSaving(false); return; }
      toast.success("Produit ajouté !");
    }
    setSaving(false);
    setShowForm(false);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Produit supprimé");
    loadProducts();
  };

  const handleStockDeduct = async () => {
    if (!showStockModal || stockDeduct < 1) return;
    const currentQty = (showStockModal as any).stock_qty ?? 0;
    const newQty = Math.max(0, currentQty - stockDeduct);
    const { error } = await supabase.from("products").update({ stock_qty: newQty }).eq("id", showStockModal.id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(`✅ ${stockDeduct} unité(s) retirée(s) — Stock: ${newQty}`);
    setShowStockModal(null);
    setStockDeduct(1);
    loadProducts();
  };


  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase">Total produits</p>
          <p className="font-heading text-xl font-bold">{products.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase">En stock</p>
          <p className="font-heading text-xl font-bold text-emerald-400">{products.filter(p => p.in_stock).length}</p>
        </div>
        <div className="bg-card border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-400" />
            <p className="text-[10px] text-muted-foreground uppercase">Stock faible</p>
          </div>
          <p className="font-heading text-xl font-bold text-amber-400">{products.filter(p => (p.stock_qty ?? 0) <= 5 && (p.stock_qty ?? 0) > 0).length}</p>
        </div>
        <div className="bg-card border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-400" />
            <p className="text-[10px] text-muted-foreground uppercase">Rupture</p>
          </div>
          <p className="font-heading text-xl font-bold text-red-400">{products.filter(p => (p.stock_qty ?? 0) === 0).length}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full h-9 rounded-lg bg-card border border-border pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" maxLength={100} />
          </div>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`p-2 ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} aria-label="Vue tableau"><List size={14} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} aria-label="Vue grille"><Grid3X3 size={14} /></button>
          </div>
          <button onClick={openAdd} className="h-9 px-3 rounded-lg gradient-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 shrink-0">
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setCategoryFilter("all")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            Tous ({products.length})
          </button>
          {categoryGroups.map(group => {
            const groupHasProducts = group.options.some(c => (categoryCounts[c.value] || 0) > 0);
            if (!groupHasProducts) return null;
            return (
              <div key={group.label} className="flex gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground/60 font-medium px-1 shrink-0">|</span>
                {group.options.map(c => {
                  const count = categoryCounts[c.value] || 0;
                  if (count === 0) return null;
                  return (
                    <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === c.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {c.label} ({count})
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* In-store stock deduction modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowStockModal(null)}>
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-base mb-1">🏪 Vente en présentiel</h3>
            <p className="text-xs text-muted-foreground mb-4">{showStockModal.name} — Stock actuel: <strong>{(showStockModal as any).stock_qty ?? 0}</strong></p>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Quantité vendue</label>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStockDeduct(Math.max(1, stockDeduct - 1))} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-muted">-</button>
              <input type="number" value={stockDeduct} onChange={e => setStockDeduct(Math.max(1, +e.target.value))} min={1} max={(showStockModal as any).stock_qty ?? 0} className="w-20 h-9 rounded-lg bg-secondary border border-border text-center text-sm" />
              <button onClick={() => setStockDeduct(stockDeduct + 1)} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-muted">+</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowStockModal(null)} className="flex-1 h-9 rounded-lg bg-secondary text-xs font-medium">Annuler</button>
              <button onClick={handleStockDeduct} className="flex-1 h-9 rounded-lg gradient-primary text-primary-foreground text-xs font-bold">✅ Retirer du stock</button>
            </div>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-2 pt-8 md:items-center md:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Form header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between rounded-t-xl">
              <h3 className="font-heading font-bold text-base">{editing ? "✏️ Modifier" : "➕ Ajouter"} un produit</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Ad URL helper — at top for easy access */}
              {editing && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-[10px] font-heading font-bold text-blue-400 uppercase mb-1.5">🔗 Lien pour publicité Facebook/Instagram</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-foreground bg-secondary px-2.5 py-1.5 rounded block break-all select-all">
                      {window.location.origin}/produit/{editing.id}
                    </code>
                    <button onClick={() => copyProductUrl(editing.id)} className="shrink-0 h-8 px-3 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium flex items-center gap-1.5 hover:bg-blue-500/20 transition-colors">
                      <Link2 size={12} /> Copier
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Utilisez ce lien dans vos carousel ads Facebook/Instagram</p>
                </div>
              )}

              {/* Image upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {form.image_url && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-secondary/30">
                      <img src={getStorageUrl(form.image_url)} alt="" className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <div>
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-8 px-3 rounded-lg bg-secondary text-xs flex items-center gap-1.5 hover:bg-muted transition-colors">
                      {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      {uploading ? "Upload..." : "📸 Image principale"}
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-converti en WebP &lt; 300 Ko</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </div>

                {/* Gallery */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">📷 Galerie photos ({form.gallery.length})</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.gallery.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-secondary/30 group">
                        <img src={getStorageUrl(img)} alt="" className="w-full h-full object-contain p-0.5" />
                        <button type="button" onClick={() => setForm(f => ({ ...f, gallery: f.gallery.filter((_, i) => i !== idx) }))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors">
                      <Plus size={16} className="text-muted-foreground" />
                      <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                    </label>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Ajoutez des photos (dos, ingrédients, etc.)</p>
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nom *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} maxLength={100} />
                <FormField label="Marque *" value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} maxLength={100} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Univers *</label>
                  <select value={form.universe} onChange={(e) => {
                    const uni = e.target.value as "beaute" | "sante";
                    const firstCat = uni === "beaute" ? beauteOptions[0].value : santeOptions[0].value;
                    setForm(f => ({ ...f, universe: uni, category: firstCat }));
                  }} className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm">
                    <option value="beaute">🌸 Beauté & Cosmétiques</option>
                    <option value="sante">💊 Santé & Compléments</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Catégorie *</label>
                  <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm">
                    {(form.universe === "beaute" ? beauteOptions : santeOptions).map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-secondary/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-heading font-bold">💰 Tarification</p>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Prix de vente *" value={form.price || ""} onChange={v => setForm(f => ({ ...f, price: +v }))} type="number" />
                  <FormField label="Ancien prix" value={form.old_price || ""} onChange={v => setForm(f => ({ ...f, old_price: v ? +v : null }))} type="number" placeholder="Facultatif" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm resize-none" maxLength={1000} placeholder="Décrivez le produit, ses bienfaits..." />
              </div>

              {/* Usage instructions */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">📋 Comment utiliser</label>
                <textarea value={form.usage_instructions} onChange={(e) => setForm(f => ({ ...f, usage_instructions: e.target.value }))} rows={3} className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm resize-none" maxLength={1000} placeholder="Ex: Prendre 1 capsule par jour avec un repas..." />
              </div>

              {/* Conseils */}
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">💡 Conseils</label>
                <textarea value={form.conseils} onChange={(e) => setForm(f => ({ ...f, conseils: e.target.value }))} rows={2} className="w-full rounded-lg bg-secondary border border-border px-3 py-2 text-sm resize-none" maxLength={1000} placeholder="Ex: À prendre le matin pour un effet optimal..." />
              </div>

              {/* Variants */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField label="Goûts (virgule)" value={flavorsInput} onChange={setFlavorsInput} placeholder="Chocolat, Vanille" />
                <FormField label="Poids (virgule)" value={weightsInput} onChange={setWeightsInput} placeholder="1kg, 2.5kg" />
                <FormField label="Objectifs (virgule)" value={objectivesInput} onChange={setObjectivesInput} placeholder="Immunité, Énergie" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Quantité en stock" value={form.stock_qty} onChange={v => setForm(f => ({ ...f, stock_qty: +v }))} type="number" />
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">📅 Date d'expiration</label>
                  <input type="date" value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 py-1">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.in_stock} onChange={(e) => setForm(f => ({ ...f, in_stock: e.target.checked }))} className="accent-primary" /> En stock</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_top_sale} onChange={(e) => setForm(f => ({ ...f, is_top_sale: e.target.checked }))} className="accent-primary" /> ⭐ Top vente</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_promo} onChange={(e) => setForm(f => ({ ...f, is_promo: e.target.checked }))} className="accent-primary" /> 🔥 Promo</label>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full h-10 rounded-lg gradient-primary text-primary-foreground font-heading font-bold text-sm">
                {saving ? "Enregistrement..." : editing ? "✅ Modifier" : "✅ Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => {
            return (
              <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-all group">
                <div className="aspect-square bg-secondary/30 relative overflow-hidden">
                  <img src={getStorageUrl(p.image_url)} alt="" className="w-full h-full object-contain p-2" />
                  {p.is_promo && <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded font-bold">PROMO</span>}
                  {p.is_top_sale && <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded font-bold">⭐</span>}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.brand}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-heading font-bold text-sm text-primary">{formatPrice(p.price)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                      !p.in_stock || (p.stock_qty ?? 0) === 0 ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                      (p.stock_qty ?? 0) <= 5 ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {p.in_stock ? `${(p as any).stock_qty ?? 0} en stock` : "Rupture"}
                    </span>
                    <div className="flex gap-0.5">
                      <button onClick={() => copyProductUrl(p.id)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-blue-400" title="Copier lien ads"><Link2 size={11} /></button>
                      <button onClick={() => { setShowStockModal(p); setStockDeduct(1); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-orange-400" title="Vente présentiel"><Minus size={11} /></button>
                      <button onClick={() => openEdit(p)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary"><Edit size={11} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-[10px] uppercase">
                  <th className="text-left px-3 py-2.5 font-medium">Produit</th>
                  <th className="text-left px-2 py-2.5 font-medium hidden md:table-cell">Marque</th>
                  <th className="text-left px-2 py-2.5 font-medium">Prix</th>
                  <th className="text-left px-2 py-2.5 font-medium hidden md:table-cell">Stock</th>
                  <th className="text-left px-2 py-2.5 font-medium hidden lg:table-cell">Cat.</th>
                  <th className="text-right px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const catLabel = categoryOptions.find(c => c.value === p.category)?.label || p.category;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-border shrink-0 bg-secondary/30">
                            <img src={getStorageUrl(p.image_url)} alt="" className="w-full h-full object-contain p-0.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate max-w-[120px] md:max-w-none">{p.name}</p>
                            <div className="flex gap-1 mt-0.5">
                              {p.is_promo && <span className="text-[8px] px-1 py-0.5 bg-red-500/10 text-red-400 rounded">PROMO</span>}
                              {p.is_top_sale && <span className="text-[8px] px-1 py-0.5 bg-amber-500/10 text-amber-400 rounded">TOP</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{p.brand}</td>
                      <td className="px-2 py-2.5">
                        <span className="font-heading font-bold text-xs text-primary">{formatPrice(p.price)}</span>
                        {p.old_price && <span className="text-[9px] text-muted-foreground line-through ms-1 block">{formatPrice(p.old_price)}</span>}
                      </td>
                      <td className="px-2 py-2.5 hidden md:table-cell">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
                          !p.in_stock || (p.stock_qty ?? 0) === 0 ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                          (p.stock_qty ?? 0) <= 5 ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                          "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {p.in_stock ? `${(p as any).stock_qty ?? 0}` : "0"}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-[10px] text-muted-foreground hidden lg:table-cell">{catLabel}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => copyProductUrl(p.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-blue-400 transition-colors" title="Copier lien ads"><Link2 size={13} /></button>
                          <button onClick={() => { setShowStockModal(p); setStockDeduct(1); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-orange-400 transition-colors" title="Vente présentiel"><Minus size={13} /></button>
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"><Edit size={13} /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun produit trouvé</td></tr>}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder, maxLength }: {
  label: string; value: any; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
    </div>
  );
}
