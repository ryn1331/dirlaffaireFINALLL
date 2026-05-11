import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Tags, Boxes, Settings, LogOut, ChevronLeft, Menu, Globe, Bell, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/context/LanguageContext";
import { formatPrice } from "@/types/database";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  orderNumber: string;
  clientName: string;
  total: number;
  timestamp: Date;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* silent fail */ }
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [criticalStockCount, setCriticalStockCount] = useState(0);
  const initialLoadDone = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, setLang } = useLang();

  const navItems = [
    { label: t("admin.dashboard"), icon: LayoutDashboard, path: "/admin" },
    { label: t("admin.orders"), icon: ShoppingCart, path: "/admin/orders", badge: pendingCount },
    { label: t("admin.products"), icon: Package, path: "/admin/products", stockAlert: lowStockCount > 0, criticalAlert: criticalStockCount > 0 },
    { label: t("admin.packs"), icon: Boxes, path: "/admin/packs" },
    { label: t("admin.promos"), icon: Tags, path: "/admin/promos" },
    { label: t("admin.settings"), icon: Settings, path: "/admin/settings" },
  ];

  useEffect(() => {
    const checkAccess = async (session: any) => {
      if (!session) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roles) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data: { session } }) => checkAccess(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load pending orders count + stock alerts
  useEffect(() => {
    const loadCounts = async () => {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "En préparation"),
        supabase.from("products").select("stock_qty"),
      ]);
      setPendingCount(ordersRes.count || 0);
      const products = productsRes.data || [];
      setLowStockCount(products.filter((p: any) => (p.stock_qty ?? 0) <= 5 && (p.stock_qty ?? 0) > 0).length);
      setCriticalStockCount(products.filter((p: any) => (p.stock_qty ?? 0) === 0).length);
    };
    loadCounts();
  }, [location.pathname]);

  // Realtime: refresh stock counts when products change
  useEffect(() => {
    const ch = supabase
      .channel('admin-products-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const { data } = await supabase.from("products").select("stock_qty");
        const products = data || [];
        setLowStockCount(products.filter((p: any) => (p.stock_qty ?? 0) <= 5 && (p.stock_qty ?? 0) > 0).length);
        setCriticalStockCount(products.filter((p: any) => (p.stock_qty ?? 0) === 0).length);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { initialLoadDone.current = true; }, 3000);
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if (!initialLoadDone.current) return;
        const order = payload.new as any;
        const notif: Notification = { id: order.id, orderNumber: order.order_number, clientName: order.client_name, total: order.total, timestamp: new Date() };
        setNotifications(prev => [notif, ...prev].slice(0, 20));
        setPendingCount(prev => prev + 1);
        playNotificationSound();
      })
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);

  const clearNotifications = useCallback(() => { setNotifications([]); setShowPanel(false); }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn("fixed md:sticky top-0 left-0 z-50 h-screen bg-card border-r border-border flex flex-col transition-all duration-300", collapsed ? "w-[68px]" : "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
          {!collapsed && <span className="font-heading text-lg font-bold text-foreground">Dir l'Affaire</span>}
          <button onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
            <ChevronLeft size={18} className={cn("transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setMobileOpen(false); }} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {(item as any).badge > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {(item as any).badge > 99 ? "99+" : (item as any).badge}
                  </span>
                )}
                {(item as any).criticalAlert && (
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
                {(item as any).stockAlert && !(item as any).criticalAlert && (
                  <span className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border shrink-0 space-y-1">
          <button onClick={() => setLang(lang === "fr" ? "ar" : "fr")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors">
            <Globe size={18} className="shrink-0" />
            {!collapsed && <span>{t("lang.switch")}</span>}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>{t("admin.logout")}</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-muted-foreground hover:text-foreground">
            <Menu size={20} />
          </button>
          <h1 className="font-heading text-lg font-bold flex-1 text-foreground">{navItems.find((n) => n.path === location.pathname)?.label || "Admin"}</h1>

          <div className="relative">
            <button onClick={() => setShowPanel(!showPanel)} className="relative p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <AnimatePresence>
              {showPanel && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <h3 className="font-heading font-bold text-sm">Notifications</h3>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && <button onClick={clearNotifications} className="text-[10px] text-primary hover:underline px-2 py-1">Tout effacer</button>}
                      <button onClick={() => setShowPanel(false)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground"><X size={14} /></button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <Bell size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Aucune nouvelle commande</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button key={notif.id} onClick={() => { navigate("/admin/orders"); setShowPanel(false); }} className="w-full flex items-start gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0 text-left">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <ShoppingCart size={14} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">Nouvelle commande <span className="text-primary font-mono">{notif.orderNumber}</span></p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{notif.clientName} · {formatPrice(notif.total)}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{notif.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
