import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/types/database";
import type { DbOrder } from "@/types/database";
import { Search, Eye, Check, X, Copy, Download, FileSpreadsheet, FileText, Truck, Filter } from "lucide-react";
import { exportOrdersPDF, exportOrdersExcel } from "@/lib/exportUtils";
import { motion } from "framer-motion";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  "Livrée": "bg-emerald-500/10 text-emerald-400",
  "Confirmée": "bg-blue-500/10 text-blue-400",
  "En préparation": "bg-amber-500/10 text-amber-400",
  "Expédiée": "bg-purple-500/10 text-purple-400",
  "Annulée": "bg-red-500/10 text-red-400",
  "Retour": "bg-orange-500/10 text-orange-400",
};

const statuses = ["Toutes", "En préparation", "Confirmée", "Expédiée", "Livrée", "Retour", "Annulée"];
const statusFlow = ["En préparation", "Confirmée", "Expédiée", "Livrée"];

function formatServiceLabel(s: string | null) {
  if (!s) return "—";
  const map: Record<string, string> = {
    yalidine_bureau: "Yalidine Bureau", yalidine_domicile: "Yalidine Domicile",
    zr_bureau: "ZR Express Bureau", zr_domicile: "ZR Express Domicile",
    swift_bureau: "Swift Bureau", swift_domicile: "Swift Domicile",
    world_bureau: "World Bureau", world_domicile: "World Domicile",
    world_domicile_remote: "World Domicile (éloigné)",
  };
  return map[s] || s;
}

function generateCSV(orders: any[], company: "world" | "swift") {
  const header = "ID;Nom;Tel;Wilaya;Commune;Adresse;Produit;Quantité;Frais;Valeur;Remarques";
  const filtered = orders.filter(o => (o.service_livraison || "").startsWith(company));
  if (!filtered.length) { toast.error(`Aucune commande ${company === "world" ? "World Express" : "Swift Express"}`); return; }
  const rows = filtered.map(o =>
    `${o.order_number};${o.client_name};${o.client_phone};${o.wilaya};${o.commune};${o.address};${(o._items || []).map((i: any) => i.product_name).join(", ")};${(o._items || []).reduce((s: number, i: any) => s + i.quantity, 0)};${o.delivery_fee || 0};${o.total};${o.notes || ""}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Export_${company === "world" ? "WorldExpress" : "SwiftExpress"}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${filtered.length} commandes exportées`);
}

function copyColisInfo(order: any) {
  const items = (order._items || []).map((i: any) => `${i.product_name} x${i.quantity}`).join(", ");
  const text = `${order.order_number}\n${order.client_name}\n${order.client_phone}\n${order.wilaya} - ${order.commune}\n${order.address}\nProduits: ${items}\nTotal: ${formatPrice(order.total)}\n${order.notes || ""}`;
  navigator.clipboard.writeText(text).then(() => toast.success("Infos colis copiées !"));
}

// Stock management: adjust stock when order status changes
async function adjustStock(orderItems: any[], direction: "decrement" | "increment") {
  for (const item of orderItems) {
    let productId = item.product_id;
    
    // Fallback: find product by name if product_id is missing (old orders)
    if (!productId) {
      const { data: products } = await supabase
        .from("products")
        .select("id, stock_qty")
        .eq("name", item.product_name)
        .limit(1);
      if (products && products.length > 0) productId = products[0].id;
    }

    if (productId) {
      const { data: prod } = await supabase.from("products").select("stock_qty").eq("id", productId).single();
      const currentQty = prod?.stock_qty ?? 0;
      const newQty = direction === "decrement"
        ? Math.max(0, currentQty - item.quantity)
        : currentQty + item.quantity;
      await supabase.from("products").update({ stock_qty: newQty }).eq("id", productId);
    }
  }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Toutes");
  const [wilayaFilter, setWilayaFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadOrders = async () => {
    // Paginated: load last 200 orders max for performance
    const { data: ordersData } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    const orderIds = (ordersData || []).map(o => o.id);
    // Load items only for fetched orders
    const { data: itemsData } = orderIds.length > 0
      ? await supabase.from("order_items").select("*").in("order_id", orderIds)
      : { data: [] };
    const itemsByOrder = (itemsData || []).reduce((acc: any, item: any) => {
      (acc[item.order_id] = acc[item.order_id] || []).push(item);
      return acc;
    }, {});
    setOrders((ordersData || []).map(o => ({ ...o, _items: itemsByOrder[o.id] || [] })));
  };

  useEffect(() => { loadOrders(); }, []);

  const filtered = useMemo(() => orders.filter(o => {
    const matchSearch = o.client_name.toLowerCase().includes(search.toLowerCase()) || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.client_phone.includes(search);
    const matchStatus = activeFilter === "Toutes" || o.status === activeFilter;
    const matchWilaya = !wilayaFilter || o.wilaya === wilayaFilter;
    const matchService = !serviceFilter || (o.service_livraison || "").startsWith(serviceFilter);
    return matchSearch && matchStatus && matchWilaya && matchService;
  }), [orders, search, activeFilter, wilayaFilter, serviceFilter]);

  const wilayas = useMemo(() => [...new Set(orders.map(o => o.wilaya))].sort(), [orders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const oldStatus = order.status;
    const items = order._items || [];

    // Stock logic:
    // Confirmée → decrement stock (reserved for this order)
    // Retour → increment stock back (order returned)
    // If going FROM Confirmée/Expédiée/Livrée TO Annulée before expedition → increment back
    
    const wasConfirmed = ["Confirmée", "Expédiée", "Livrée"].includes(oldStatus);
    const isBeingConfirmed = newStatus === "Confirmée" && oldStatus === "En préparation";
    const isBeingReturned = newStatus === "Retour" && wasConfirmed;
    const isBeingCancelled = newStatus === "Annulée" && wasConfirmed;

    if (isBeingConfirmed && items.length > 0) {
      await adjustStock(items, "decrement");
      toast.info(`📦 Stock mis à jour: -${items.reduce((s: number, i: any) => s + i.quantity, 0)} unité(s)`);
    } else if ((isBeingReturned || isBeingCancelled) && items.length > 0) {
      await adjustStock(items, "increment");
      toast.info(`📦 Stock restauré: +${items.reduce((s: number, i: any) => s + i.quantity, 0)} unité(s)`);
    }

    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) { toast.error("Erreur"); return; }
    toast.success(`Statut → ${newStatus}`);

    // Auto-create shipment when order is confirmed (if not already shipped)
    if (isBeingConfirmed && !order.tracking_number) {
      const svc = order.service_livraison || "";
      if (svc.startsWith("yalidine") || svc.startsWith("zr")) {
        toast.info(`📦 Envoi auto vers ${svc.startsWith("yalidine") ? "Yalidine" : "ZR Express"}...`);
        await createShipment(orderId);
      }
    }

    loadOrders();
    if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus });
  };

  const viewOrder = async (order: any) => {
    setSelectedOrder(order);
    setOrderItems(order._items || []);
  };

  const [creatingShipment, setCreatingShipment] = useState(false);
  const createShipment = async (orderId: string) => {
    setCreatingShipment(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-shipment", { body: { order_id: orderId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const tracking = (data as any).tracking_number;
      toast.success(`📦 Expédition créée: ${tracking}`);
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        const refreshed = await supabase.from("orders").select("*").eq("id", orderId).single();
        if (refreshed.data) setSelectedOrder({ ...selectedOrder, ...refreshed.data });
      }
    } catch (e: any) {
      toast.error(`Échec expédition: ${e.message || e}`);
    } finally {
      setCreatingShipment(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(o => o.id)));
  };

  const selectedOrders = orders.filter(o => selected.has(o.id));

  return (
    <div className="space-y-4">
      {/* Search + filters bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher nom, N°, tél..." className="w-full h-10 rounded-md bg-card border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" maxLength={100} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={wilayaFilter} onChange={e => setWilayaFilter(e.target.value)} className="h-9 rounded-md bg-card border border-border px-2 text-xs">
              <option value="">Toutes wilayas</option>
              {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="h-9 rounded-md bg-card border border-border px-2 text-xs">
              <option value="">Tous services</option>
              <option value="yalidine">Yalidine</option>
              <option value="zr">ZR Express</option>
              <option value="world">World Express</option>
              <option value="swift">Swift Express</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {statuses.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export bar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => exportOrdersPDF(filtered, `Commandes_${activeFilter}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
          <FileText size={14} className="text-red-400" /> PDF
        </button>
        <button onClick={() => exportOrdersExcel(filtered, `Commandes_${activeFilter}`)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
          <FileSpreadsheet size={14} className="text-emerald-400" /> Excel
        </button>
        <button onClick={() => generateCSV(selected.size ? selectedOrders : filtered, "world")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
          <Download size={14} /> CSV World Express {selected.size > 0 && `(${selected.size})`}
        </button>
        <button onClick={() => generateCSV(selected.size ? selectedOrders : filtered, "swift")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/10 text-xs font-medium text-orange-400 hover:bg-orange-500/20 transition-colors">
          <Download size={14} /> CSV Swift Express {selected.size > 0 && `(${selected.size})`}
        </button>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">{selectedOrder.order_number}</h3>
              <div className="flex gap-2">
                <button onClick={() => copyColisInfo(selectedOrder)} className="p-2 rounded-md bg-secondary hover:bg-secondary/80 text-xs" title="Copier infos colis"><Copy size={14} /></button>
                <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-muted-foreground">Client:</span> {selectedOrder.client_name}</p>
              <p><span className="text-muted-foreground">Téléphone:</span> {selectedOrder.client_phone}</p>
              <p><span className="text-muted-foreground">Wilaya:</span> {selectedOrder.wilaya}</p>
              <p><span className="text-muted-foreground">Commune:</span> {selectedOrder.commune}</p>
              <p><span className="text-muted-foreground">Adresse:</span> {selectedOrder.address}</p>
              <p><span className="text-muted-foreground">Service:</span> {formatServiceLabel(selectedOrder.service_livraison)}</p>
              <p><span className="text-muted-foreground">Frais livraison:</span> {formatPrice(selectedOrder.delivery_fee || 0)}</p>
              {selectedOrder.notes && <p><span className="text-muted-foreground">Notes:</span> {selectedOrder.notes}</p>}
            </div>

            <h4 className="font-heading font-bold text-sm mb-2">Produits</h4>
            <div className="space-y-2 mb-4">
              {orderItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm p-2 bg-secondary/30 rounded">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.flavor && `${item.flavor} · `}{item.weight && `${item.weight} · `}x{item.quantity}</p>
                  </div>
                  <span className="font-heading font-bold text-primary">{formatPrice(item.total_price)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{formatPrice(selectedOrder.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span>{formatPrice(selectedOrder.delivery_fee || 0)}</span></div>
              <div className="flex justify-between font-heading font-bold text-base"><span>Total</span><span className="text-primary">{formatPrice(selectedOrder.total)}</span></div>
            </div>

            <h4 className="font-heading font-bold text-sm mt-4 mb-2">Changer le statut</h4>
            <div className="flex flex-wrap gap-2">
              {statusFlow.map(s => (
                <button key={s} onClick={() => updateStatus(selectedOrder.id, s)} disabled={selectedOrder.status === s} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedOrder.status === s ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
              <button onClick={() => updateStatus(selectedOrder.id, "Retour")} className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">Retour</button>
              <button onClick={() => updateStatus(selectedOrder.id, "Annulée")} className="px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20">Annuler</button>
            </div>

            {/* Création d'expédition Yalidine / ZR */}
            {(selectedOrder.service_livraison?.startsWith("yalidine") || selectedOrder.service_livraison?.startsWith("zr")) && (
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-heading font-bold text-xs mb-2 flex items-center gap-1.5"><Truck size={14} /> Expédition</h4>
                {selectedOrder.tracking_number ? (
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Tracking:</span> <span className="font-mono font-bold text-primary">{selectedOrder.tracking_number}</span></p>
                    <button onClick={() => navigator.clipboard.writeText(selectedOrder.tracking_number).then(() => toast.success("Copié"))} className="text-[10px] text-primary underline">Copier</button>
                    {selectedOrder.shipping_label_url && (
                      <a href={selectedOrder.shipping_label_url} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-primary underline">📄 Télécharger l'étiquette</a>
                    )}
                  </div>
                ) : (
                  <>
                    <button onClick={() => createShipment(selectedOrder.id)} disabled={creatingShipment}
                      className="w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50">
                      {creatingShipment ? "Création..." : `📦 Créer expédition ${selectedOrder.service_livraison?.startsWith("yalidine") ? "Yalidine" : "ZR Express"}`}
                    </button>
                    {selectedOrder.shipping_error && (
                      <p className="text-[10px] text-destructive mt-1.5">⚠️ {selectedOrder.shipping_error}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Stock info notice */}
            <div className="mt-3 p-2 bg-secondary/30 rounded-lg">
              <p className="text-[10px] text-muted-foreground">
                📦 <strong>Gestion stock auto:</strong> Confirmée → stock déduit · Retour/Annulée → stock restauré
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Orders table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="px-3 py-3 w-8"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" /></th>
                <th className="text-left px-3 py-3 font-medium">Commande</th>
                <th className="text-left px-3 py-3 font-medium">Client</th>
                <th className="text-left px-3 py-3 font-medium hidden lg:table-cell">Wilaya</th>
                <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Service</th>
                <th className="text-left px-3 py-3 font-medium">Total</th>
                <th className="text-left px-3 py-3 font-medium">Statut</th>
                <th className="text-right px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-3"><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" /></td>
                  <td className="px-3 py-3">
                    <p className="font-mono text-xs text-primary">{o.order_number}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fr-FR")}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-sm">{o.client_name}</p>
                    <p className="text-[10px] text-muted-foreground">{o.client_phone}</p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground hidden lg:table-cell text-xs">{o.wilaya}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">{formatServiceLabel(o.service_livraison)}</span>
                  </td>
                  <td className="px-3 py-3 font-heading font-bold text-xs">{formatPrice(o.total)}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${statusColors[o.status] || ""}`}>{o.status}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => copyColisInfo(o)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Copier infos colis"><Copy size={12} /></button>
                      <button onClick={() => viewOrder(o)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucune commande</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {filtered.length} commande{filtered.length !== 1 ? "s" : ""} · {selected.size > 0 && `${selected.size} sélectionnée(s)`}
        </div>
      </motion.div>
    </div>
  );
}
