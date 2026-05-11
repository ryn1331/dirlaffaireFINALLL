import { useState, useEffect } from "react";
import { Truck, Search, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DeliveryZone } from "@/hooks/useDeliveryZones";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminDelivery() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("delivery_zones").select("*").order("code");
      setZones((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const updateZone = (id: string, field: keyof DeliveryZone, value: any) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
    setEdited(prev => new Set(prev).add(id));
  };

  const handleSave = async () => {
    if (edited.size === 0) return;
    setSaving(true);
    try {
      const toSave = zones.filter(z => edited.has(z.id));
      for (const z of toSave) {
        await supabase.from("delivery_zones").update({
          has_zr_express: z.has_zr_express,
          has_yalidine: z.has_yalidine,
          yalidine_bureau_price: z.yalidine_bureau_price,
          yalidine_domicile_price: z.yalidine_domicile_price,
          zr_bureau_price: z.zr_bureau_price,
          zr_domicile_price: z.zr_domicile_price,
          remote_price: z.remote_price,
        }).eq("id", z.id);
      }
      queryClient.invalidateQueries({ queryKey: ["delivery_zones"] });
      setEdited(new Set());
      toast.success(`${toSave.length} zone(s) sauvegardée(s)`);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  const filtered = zones.filter(z =>
    z.name.toLowerCase().includes(search.toLowerCase()) || z.code.includes(search)
  );

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Truck size={20} className="text-primary" />
          <h2 className="font-heading text-lg font-bold">Zones de livraison</h2>
          <span className="text-xs text-muted-foreground">({zones.length} wilayas)</span>
        </div>
        <div className="flex items-center gap-2">
          {edited.size > 0 && (
            <span className="text-xs text-primary font-medium">{edited.size} modif.</span>
          )}
          <Button onClick={handleSave} disabled={saving || edited.size === 0} size="sm" className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une wilaya..."
          className="w-full h-9 rounded-lg bg-secondary border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Wilaya</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">ZR Express</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">Yalidine</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">ZR Bureau</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">ZR Domicile</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">Y. Bureau</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">Y. Domicile</th>
                <th className="text-center px-2 py-2 font-medium text-xs text-muted-foreground">Zone éloignée</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(zone => (
                <tr key={zone.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${edited.has(zone.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    <span className="text-muted-foreground text-xs mr-1">{zone.code}</span>
                    {zone.name}
                  </td>
                  <td className="text-center px-2 py-2">
                    <Switch
                      checked={zone.has_zr_express}
                      onCheckedChange={v => updateZone(zone.id, "has_zr_express", v)}
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Switch
                      checked={zone.has_yalidine}
                      onCheckedChange={v => updateZone(zone.id, "has_yalidine", v)}
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <input
                      type="number"
                      value={zone.zr_bureau_price}
                      onChange={e => updateZone(zone.id, "zr_bureau_price", Number(e.target.value))}
                      className="w-16 h-7 text-center text-xs rounded bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                      disabled={!zone.has_zr_express}
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <input
                      type="number"
                      value={zone.zr_domicile_price}
                      onChange={e => updateZone(zone.id, "zr_domicile_price", Number(e.target.value))}
                      className="w-16 h-7 text-center text-xs rounded bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                      disabled={!zone.has_zr_express}
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <input
                      type="number"
                      value={zone.yalidine_bureau_price}
                      onChange={e => updateZone(zone.id, "yalidine_bureau_price", Number(e.target.value))}
                      className="w-16 h-7 text-center text-xs rounded bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                      disabled={!zone.has_yalidine}
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <input
                      type="number"
                      value={zone.yalidine_domicile_price}
                      onChange={e => updateZone(zone.id, "yalidine_domicile_price", Number(e.target.value))}
                      className="w-16 h-7 text-center text-xs rounded bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                      disabled={!zone.has_yalidine}
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <input
                      type="number"
                      value={zone.remote_price}
                      onChange={e => updateZone(zone.id, "remote_price", Number(e.target.value))}
                      className="w-16 h-7 text-center text-xs rounded bg-secondary border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                      disabled={zone.has_zr_express || zone.has_yalidine}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
