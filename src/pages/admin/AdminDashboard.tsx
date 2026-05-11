import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/types/database";
import { ShoppingCart, Package, DollarSign, ArrowUpRight, TrendingUp, Calendar, AlertCircle, Clock, Truck, CheckCircle2, XCircle, Activity, FileText, FileSpreadsheet, RotateCcw } from "lucide-react";
import { exportDashboardPDF, exportDashboardExcel } from "@/lib/exportUtils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

const COLORS = ["hsl(142,60%,45%)", "hsl(217,70%,55%)", "hsl(45,100%,50%)", "hsl(270,60%,55%)", "hsl(0,70%,55%)", "hsl(30,80%,50%)"];

// Statuses: "En préparation" | "Confirmée" | "Expédiée" | "Livrée" | "Annulée" | "Retour"
// Revenue logic:
// - "Confirmée" + "Livrée" = counted as revenue (subtotal only, excluding delivery fees)
// - "Retour" = subtract from revenue
// - "Annulée" = not counted

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    revenue: 0, orders: 0, products: 0, clients: 0,
    pendingOrders: 0, avgOrderValue: 0, deliveredOrders: 0, confirmedOrders: 0,
    returnOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [ordersByDay, setOrdersByDay] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [ordersRes, productsRes, clientsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("products").select("id, name, category, price, stock_qty, image_url, expiration_date"),
        supabase.from("clients").select("id").limit(1000),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      // Revenue = subtotal of Confirmée + Livrée orders (excluding delivery fees)
      const revenueOrders = orders.filter(o => o.status === "Livrée" || o.status === "Confirmée");
      const returnOrders = orders.filter(o => o.status === "Retour");
      
      const grossRevenue = revenueOrders.reduce((s, o) => s + o.subtotal, 0);
      const returnRevenue = returnOrders.reduce((s, o) => s + o.subtotal, 0);
      const revenue = grossRevenue - returnRevenue;

      const pendingOrders = orders.filter(o => o.status === "En préparation").length;
      const deliveredOrders = orders.filter(o => o.status === "Livrée").length;
      const confirmedOrders = orders.filter(o => o.status === "Confirmée").length;
      const returnCount = returnOrders.length;
      const avgOrderValue = orders.length > 0 ? Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length) : 0;

      setStats({
        revenue, orders: orders.length, products: products.length,
        clients: (clientsRes.data || []).length, pendingOrders, avgOrderValue,
        deliveredOrders, confirmedOrders, returnOrders: returnCount,
      });
      setRecentOrders(orders.slice(0, 8));

      // Low stock
      setLowStockProducts(products.filter(p => (p.stock_qty ?? 0) <= 5).sort((a, b) => (a.stock_qty ?? 0) - (b.stock_qty ?? 0)).slice(0, 5));

      // Expiring within 60 days
      const now = new Date();
      const limit = new Date(); limit.setDate(limit.getDate() + 60);
      setExpiringProducts(
        products
          .filter((p: any) => p.expiration_date && new Date(p.expiration_date) <= limit)
          .sort((a: any, b: any) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())
          .slice(0, 5)
          .map((p: any) => ({ ...p, daysLeft: Math.ceil((new Date(p.expiration_date).getTime() - now.getTime()) / 86400000) }))
      );

      // Orders by day (last 7 days)
      const dayMap: Record<string, { count: number; revenue: number }> = {};
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split('T')[0]] = { count: 0, revenue: 0 };
      }
      orders.forEach(o => {
        const key = o.created_at.split('T')[0];
        if (dayMap[key]) {
          dayMap[key].count++;
          if (o.status === "Livrée" || o.status === "Confirmée") {
            dayMap[key].revenue += o.subtotal;
          }
        }
      });
      const dayData = Object.entries(dayMap).map(([date, data]) => {
        const d = new Date(date);
        return { name: dayNames[d.getDay()], commandes: data.count, revenue: data.revenue };
      });
      setOrdersByDay(dayData);

      // Status distribution
      const statusCount: Record<string, number> = {};
      orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
      setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

      // Category distribution
      const catCount: Record<string, number> = {};
      products.forEach(p => { catCount[p.category] = (catCount[p.category] || 0) + 1; });
      setCategoryData(Object.entries(catCount).map(([name, value]) => ({ name, value })));

      // Top products - use order_items to calculate
      const orderItemsRes = await supabase.from("order_items").select("product_name, quantity, total_price, order_id");
      const items = orderItemsRes.data || [];
      const revenueOrderIds = new Set(revenueOrders.map(o => o.id));
      const productMap: Record<string, { sold: number; revenue: number }> = {};
      items.forEach((item) => {
        if (!revenueOrderIds.has(item.order_id)) return;
        if (!productMap[item.product_name]) productMap[item.product_name] = { sold: 0, revenue: 0 };
        productMap[item.product_name].sold += item.quantity;
        productMap[item.product_name].revenue += item.total_price;
      });
      setTopProducts(Object.entries(productMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    };
    load();
  }, []);

  const statusColors: Record<string, string> = {
    "Livrée": "bg-emerald-500/10 text-emerald-400",
    "Confirmée": "bg-blue-500/10 text-blue-400",
    "En préparation": "bg-amber-500/10 text-amber-400",
    "Expédiée": "bg-purple-500/10 text-purple-400",
    "Annulée": "bg-red-500/10 text-red-400",
    "Retour": "bg-orange-500/10 text-orange-400",
  };

  const statusIcons: Record<string, any> = {
    "En préparation": Clock,
    "Confirmée": CheckCircle2,
    "Expédiée": Truck,
    "Livrée": CheckCircle2,
    "Annulée": XCircle,
    "Retour": RotateCcw,
  };

  const statCards = [
    { label: "Chiffre d'affaires", value: formatPrice(stats.revenue), icon: DollarSign, sub: `${stats.deliveredOrders} livrées · ${stats.confirmedOrders} confirmées`, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
    { label: "Commandes", value: stats.orders.toString(), icon: ShoppingCart, sub: `${stats.pendingOrders} en attente`, color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
    { label: "Retours", value: stats.returnOrders.toString(), icon: RotateCcw, sub: "Commandes retournées", color: "from-orange-500/20 to-orange-500/5", iconColor: "text-orange-400" },
    { label: "Produits", value: stats.products.toString(), icon: Package, sub: `Panier moyen: ${formatPrice(stats.avgOrderValue)}`, color: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs font-heading font-bold mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} className="text-xs text-muted-foreground">
              {p.dataKey === 'revenue' ? formatPrice(p.value) : `${p.value} commande(s)`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-primary/10 via-card to-card border border-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold">Bienvenue 👋</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Résumé de votre activité · CA = hors frais de livraison</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => exportDashboardPDF(stats, topProducts, ordersByDay)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
            <FileText size={12} className="text-red-400" /> PDF
          </button>
          <button onClick={() => exportDashboardExcel(stats, topProducts, ordersByDay, categoryData, statusData)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors">
            <FileSpreadsheet size={12} className="text-emerald-400" /> Excel
          </button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-xl p-3.5 hover:border-primary/20 transition-all group">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-2`}>
                <Icon size={16} className={stat.iconColor} />
              </div>
              <p className="font-heading text-lg md:text-xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
              <p className="text-[9px] text-muted-foreground/70 mt-0.5">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm">Chiffre d'affaires (7j)</h3>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> CA</span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ordersByDay}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217,70%,55%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(217,70%,55%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,52%)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(0,0%,52%)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(217,70%,55%)" fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status pie */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-heading font-bold text-sm mb-3">Statut Commandes</h3>
          {statusData.length > 0 ? (
            <>
              <div className="h-[120px] mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                      {statusData.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {statusData.map((s: any, idx: number) => {
                  const Icon = statusIcons[s.name] || Clock;
                  return (
                    <div key={s.name} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <Icon size={10} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="text-xs font-bold">{s.value}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Aucune commande</p>
          )}
        </motion.div>
      </div>


      {/* Middle row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <h3 className="font-heading font-bold text-sm">Top Produits</h3>
            </div>
            <button onClick={() => navigate("/admin/products")} className="text-[10px] text-primary flex items-center gap-1 hover:underline">Catalogue <ArrowUpRight size={10} /></button>
          </div>
          {topProducts.length === 0 ? (
            <div className="text-center py-6">
              <Package size={28} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune vente encore</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => {
                const maxRevenue = topProducts[0]?.revenue || 1;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div key={p.name} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-sm shrink-0">
                      {i < 3 ? medals[i] : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground shrink-0">{p.sold} vendus</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-heading font-bold block">{formatPrice(p.revenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Low stock + Category */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <h3 className="font-heading font-bold text-xs">Stock Faible</h3>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-2">✅ Tous les stocks sont OK</p>
            ) : (
              <div className="space-y-1.5">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-[10px] truncate max-w-[140px]">{p.name}</span>
                    <span className={`text-[10px] font-bold font-mono ${(p.stock_qty ?? 0) === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {p.stock_qty ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-orange-400" />
              <h3 className="font-heading font-bold text-xs">Expiration prochaine (≤ 60j)</h3>
            </div>
            {expiringProducts.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-2">✅ Aucun produit ne périme bientôt</p>
            ) : (
              <div className="space-y-1.5">
                {expiringProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                    <span className="text-[10px] truncate max-w-[140px]">{p.name}</span>
                    <span className={`text-[10px] font-bold font-mono ${p.daysLeft <= 0 ? 'text-red-400' : p.daysLeft <= 30 ? 'text-orange-400' : 'text-amber-400'}`}>
                      {p.daysLeft <= 0 ? 'Expiré' : `${p.daysLeft}j`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-purple-400" />
              <h3 className="font-heading font-bold text-xs">Catalogue</h3>
            </div>
            {categoryData.length > 0 ? (
              <div className="space-y-1.5">
                {categoryData.map((cat: any, idx: number) => (
                  <div key={cat.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-[10px] capitalize text-muted-foreground flex-1">{cat.name}</span>
                    <span className="text-[10px] font-bold">{cat.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Aucune donnée</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-4 pb-0">
          <h3 className="font-heading font-bold text-sm">Commandes récentes</h3>
          <button onClick={() => navigate("/admin/orders")} className="text-[10px] text-primary flex items-center gap-1 hover:underline">Voir tout <ArrowUpRight size={10} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[10px] uppercase">
                <th className="text-left px-4 pb-2 font-medium">N°</th>
                <th className="text-left px-2 pb-2 font-medium">Client</th>
                <th className="text-left px-2 pb-2 font-medium hidden md:table-cell">Wilaya</th>
                <th className="text-left px-2 pb-2 font-medium hidden sm:table-cell">Date</th>
                <th className="text-left px-2 pb-2 font-medium">Total</th>
                <th className="text-left px-2 pb-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate("/admin/orders")}>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-primary">{order.order_number}</td>
                  <td className="px-2 py-2.5">
                    <p className="font-medium text-xs">{order.client_name}</p>
                    <p className="text-[9px] text-muted-foreground md:hidden">{order.wilaya}</p>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{order.wilaya}</td>
                  <td className="px-2 py-2.5 text-[10px] text-muted-foreground hidden sm:table-cell">{new Date(order.created_at).toLocaleDateString("fr-FR", { day: '2-digit', month: 'short' })}</td>
                  <td className="px-2 py-2.5 font-heading font-bold text-xs">{formatPrice(order.total)}</td>
                  <td className="px-2 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusColors[order.status] || ""}`}>{order.status}</span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">Aucune commande</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
