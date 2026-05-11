import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getStorageUrl, type PackWithItems } from "@/types/database";
import { compressImage } from "@/lib/imageUtils";
import { Plus, Edit, Trash2, Boxes, X, Upload, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function AdminPacks() {
  const [packs, setPacks] = useState<PackWithItems[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PackWithItems | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: 0, old_price: null as number | null, active: true, image_url: null as string | null, stock_qty: 0, duration: "" });
  const [itemsInput, setItemsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPacks = async () => {
    const { data } = await supabase.from("packs").select("*, pack_items(*)").order("created_at", { ascending: false });
    setPacks((data as any) || []);
  };

  useEffect(() => { loadPacks(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: 0, old_price: null, active: true, image_url: null, stock_qty: 0, duration: "" });
    setItemsInput("");
    setShowForm(true);
  };

  const openEdit = (pack: PackWithItems) => {
    setEditing(pack);
    setForm({ name: pack.name, description: pack.description || "", price: pack.price, old_price: pack.old_price, active: pack.active ?? true, image_url: pack.image_url, stock_qty: (pack as any).stock_qty ?? 0, duration: (pack as any).duration || "" });
    setItemsInput((pack.pack_items || []).map(i => i.product_name).join(", "));
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { blob } = await compressImage(file, { maxWidth: 1200, quality: 0.82, format: "webp" });
      const path = `packs/${Date.now()}.webp`;
      const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, image_url: path }));
      const sizeKB = Math.round(blob.size / 1024);
      toast.success(`Image compressée (${sizeKB} Ko) et uploadée !`);
    } catch {
      toast.error("Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error("Remplissez les champs requis"); return; }
    setSaving(true);

    const packData = { name: form.name, description: form.description || null, price: form.price, old_price: form.old_price || null, active: form.active, image_url: form.image_url, stock_qty: form.stock_qty, duration: form.duration || null };
    const itemNames = itemsInput.split(",").map(s => s.trim()).filter(Boolean);

    if (editing) {
      const { error } = await supabase.from("packs").update(packData).eq("id", editing.id);
      if (error) { toast.error("Erreur"); setSaving(false); return; }
      // Update pack items
      await supabase.from("pack_items").delete().eq("pack_id", editing.id);
      if (itemNames.length > 0) {
        await supabase.from("pack_items").insert(itemNames.map(name => ({ pack_id: editing.id, product_name: name })));
      }
      toast.success("Pack modifié !");
    } else {
      const { data, error } = await supabase.from("packs").insert(packData).select("id").single();
      if (error) { toast.error("Erreur"); setSaving(false); return; }
      if (itemNames.length > 0) {
        await supabase.from("pack_items").insert(itemNames.map(name => ({ pack_id: data.id, product_name: name })));
      }
      toast.success("Pack créé !");
    }
    setSaving(false);
    setShowForm(false);
    loadPacks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce pack ?")) return;
    await supabase.from("pack_items").delete().eq("pack_id", id);
    const { error } = await supabase.from("packs").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Pack supprimé");
    loadPacks();
  };

  const toggleActive = async (pack: PackWithItems) => {
    await supabase.from("packs").update({ active: !pack.active }).eq("id", pack.id);
    loadPacks();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez les packs visibles côté client</p>
        <button onClick={openAdd} className="h-10 px-4 rounded-md gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Créer un pack
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{editing ? "Modifier" : "Créer"} un pack</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Image du pack</label>
                <div className="flex items-center gap-3">
                  {form.image_url && <img src={getStorageUrl(form.image_url)} alt="" className="w-16 h-16 rounded-md object-cover" />}
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="h-10 px-4 rounded-md bg-secondary text-sm flex items-center gap-2">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? "Upload..." : "Choisir"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Nom *</label><input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" maxLength={100} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Description</label><input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" maxLength={200} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Prix *</label><input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: +e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Ancien prix</label><input type="number" value={form.old_price || ""} onChange={(e) => setForm(f => ({ ...f, old_price: e.target.value ? +e.target.value : null }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Produits du pack (séparés par virgule)</label><input value={itemsInput} onChange={(e) => setItemsInput(e.target.value)} placeholder="Gold Standard Whey, Creatine Monohydrate" className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Quantité en stock</label><input type="number" value={form.stock_qty} onChange={(e) => setForm(f => ({ ...f, stock_qty: +e.target.value }))} className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" min={0} /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Durée du pack</label><input value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="1 mois, 3 mois" className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm py-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-primary" /> Actif (visible côté client)</label>
              <button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-md gradient-primary text-primary-foreground font-heading font-bold">{saving ? "Enregistrement..." : editing ? "Modifier" : "Créer"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack, i) => (
          <motion.div key={pack.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            {pack.image_url && (
              <div className="h-32 overflow-hidden bg-muted">
                <img src={getStorageUrl(pack.image_url)} alt={pack.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Boxes size={16} className="text-primary" /></div>
                  <div>
                    <h3 className="font-heading font-bold text-sm">{pack.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{pack.description}</p>
                  </div>
                </div>
                <button onClick={() => toggleActive(pack)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium cursor-pointer ${pack.active ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                  {pack.active ? "Actif" : "Inactif"}
                </button>
              </div>

              <div className="flex-1 space-y-1.5 mb-4">
                {(pack.pack_items || []).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />{p.product_name}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <span className="font-heading font-bold text-primary text-lg">{formatPrice(pack.price)}</span>
                  {pack.old_price && <span className="text-xs text-muted-foreground line-through ml-2">{formatPrice(pack.old_price)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">Qté: {(pack as any).stock_qty ?? 0}</span>
                  {(pack as any).duration && <span className="text-[10px] text-muted-foreground">· {(pack as any).duration}</span>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 pt-2">
                <button onClick={() => openEdit(pack)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"><Edit size={14} /></button>
                <button onClick={() => handleDelete(pack.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          </motion.div>
        ))}
        {packs.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Aucun pack</p>}
      </div>
    </div>
  );
}
