import { useState, useMemo, useEffect } from "react";
import { X, Check, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getStorageUrl, type DbProduct } from "@/types/database";
import { useDeliveryZones, getDeliveryOptionsFromZone } from "@/hooks/useDeliveryZones";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { trackPurchase, trackInitiateCheckout } from "@/lib/metaPixel";
import { MESSENGER_URL } from "@/lib/messenger";
import { useLang } from "@/context/LanguageContext";

interface OrderFormProps {
  product: DbProduct;
  quantity: number;
  onClose: () => void;
}

type ShippingService = "yalidine" | "zr";

interface YalidineWilaya { id: number; name: string; }
interface YalidineCommune { id: number; name: string; wilaya_id: number; has_stop_desk: boolean; }
interface YalidineFees { per_commune: Record<string, { commune_name: string; express_home: number; express_desk: number; }>; }
interface ZrTerritory { id: string | number; name: string; code?: string; }
interface ZrCommune { id: string | number; name: string; code?: string; }

export default function OrderForm({ product, quantity, onClose }: OrderFormProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const { data: fallbackZones = [] } = useDeliveryZones();
  const { t } = useLang();

  // Service-first flow
  const [service, setService] = useState<ShippingService | "">("");
  const [yalidineWilayas, setYalidineWilayas] = useState<YalidineWilaya[]>([]);
  const [yalidineCommunes, setYalidineCommunes] = useState<YalidineCommune[]>([]);
  const [zrTerritories, setZrTerritories] = useState<ZrTerritory[]>([]);
  const [zrCommunes, setZrCommunes] = useState<ZrCommune[]>([]);
  const [rates, setRates] = useState<{ home: number; desk: number } | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", wilayaId: "", wilayaName: "", communeName: "",
    address: "", comment: "", qty: quantity, deliveryType: "" as "" | "domicile" | "bureau",
  });

  // Charger les wilayas/territoires quand le service change
  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    setLoadingLocations(true);
    setApiError(null);
    setForm(f => ({ ...f, wilayaId: "", wilayaName: "", communeName: "", deliveryType: "" }));
    setRates(null);
    setYalidineCommunes([]);
    setZrCommunes([]);

    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-locations?service=${service}&type=wilayas`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await resp.json();
        if (cancelled) return;
        if (!resp.ok) throw new Error(json.error || "Erreur API livraison");

        if (service === "yalidine") {
          setYalidineWilayas(json as YalidineWilaya[]);
        } else {
          setZrTerritories(json as ZrTerritory[]);
        }
      } catch (e: any) {
        if (!cancelled) setApiError(e.message || "Impossible de charger les wilayas");
      } finally {
        if (!cancelled) setLoadingLocations(false);
      }
    })();
    return () => { cancelled = true; };
  }, [service]);

  // Charger communes selon le service quand wilaya change
  useEffect(() => {
    if (!service || !form.wilayaId) return;
    let cancelled = false;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-locations?service=${service}&type=communes&wilaya_id=${form.wilayaId}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok) {
          if (service === "yalidine") setYalidineCommunes(json as YalidineCommune[]);
          if (service === "zr") setZrCommunes(json as ZrCommune[]);
        }
      } catch (_) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [service, form.wilayaId]);

  // Charger les tarifs en temps reel
  useEffect(() => {
    if (!service || !form.wilayaId) { setRates(null); return; }
    let cancelled = false;
    setLoadingRates(true);
    (async () => {
      try {
        const params = service === "yalidine"
          ? `service=yalidine&from_wilaya_id=16&to_wilaya_id=${form.wilayaId}`
          : `service=zr&territory_id=${form.wilayaId}`;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipping-rates?${params}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await resp.json();
        if (cancelled) return;
        if (!resp.ok) throw new Error(json.error);

        if (service === "yalidine" && form.communeName) {
          const fees = json as YalidineFees;
          const match = Object.values(fees.per_commune || {}).find(c => c.commune_name === form.communeName);
          if (match) setRates({ home: match.express_home, desk: match.express_desk });
        } else if (service === "zr") {
          const r = json.rates || {};
          setRates({ home: r.domicile_price ?? r.home ?? 0, desk: r.bureau_price ?? r.desk ?? 0 });
        }
      } catch (e: any) {
        if (!cancelled) {
          // Fallback sur les tarifs DB
          const zone = fallbackZones.find(z => z.code === form.wilayaId || z.name === form.wilayaName);
          if (zone) {
            setRates(service === "yalidine"
              ? { home: zone.yalidine_domicile_price, desk: zone.yalidine_bureau_price }
              : { home: zone.zr_domicile_price, desk: zone.zr_bureau_price });
          }
        }
      } finally {
        if (!cancelled) setLoadingRates(false);
      }
    })();
    return () => { cancelled = true; };
  }, [service, form.wilayaId, form.communeName, form.wilayaName, fallbackZones]);

  const deliveryFee = !rates ? 0 : form.deliveryType === "bureau" ? rates.desk : form.deliveryType === "domicile" ? rates.home : 0;
  const subtotal = product.price * form.qty;
  const total = subtotal + deliveryFee;

  const missing: string[] = [];
  if (!service) missing.push("service");
  if (form.name.trim().length < 2) missing.push("nom");
  if (form.phone.trim().length < 10) missing.push("téléphone (10 chiffres)");
  if (!form.wilayaName) missing.push("wilaya");
  if (!form.communeName.trim()) missing.push("commune");
  if (form.address.trim().length > 0 && form.address.trim().length < 3) missing.push("adresse");
  if (!form.deliveryType) missing.push("type de livraison");
  else if (deliveryFee <= 0) missing.push("tarif indisponible");
  const isValid = missing.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    trackInitiateCheckout(total, form.qty);
    setLoading(true);
    try {
      const orderId = crypto.randomUUID();
      const phone = form.phone.trim().startsWith("0") ? form.phone.trim() : `0${form.phone.trim()}`;
      const serviceCode = `${service}_${form.deliveryType}`;

      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId, order_number: "TEMP",
        client_name: form.name.trim().slice(0, 100), client_phone: phone.slice(0, 15),
        wilaya: form.wilayaName, commune: form.communeName.trim().slice(0, 100),
        address: (form.address.trim() || form.communeName.trim()).slice(0, 200),
        delivery_type: form.deliveryType, delivery_fee: deliveryFee,
        service_livraison: serviceCode,
        subtotal, total,
        notes: form.comment.trim().slice(0, 500) || null,
        status: "En préparation",
      });
      if (orderError) throw orderError;

      await supabase.from("order_items").insert({
        order_id: orderId, product_name: product.name, product_id: product.id,
        quantity: form.qty, unit_price: product.price, total_price: subtotal,
      } as any);

      await supabase.from("clients").upsert({
        name: form.name.trim().slice(0, 100), phone: phone.slice(0, 15), wilaya: form.wilayaName,
      }, { onConflict: "phone" });

      const clientRef = `CMD-${orderId.slice(0, 6).toUpperCase()}`;
      setOrderNumber(clientRef);
      trackPurchase(total, clientRef);
      setStep("success");
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'envoi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={onClose} role="dialog" aria-modal="true">
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-background/95 backdrop-blur-xl border-l border-primary/20 w-full max-w-sm h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="shrink-0 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-foreground">Commander</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Fermer"><X size={16} /></button>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col" noValidate>
            <div className="p-4 space-y-3 flex-1">
              {/* Product summary */}
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden shrink-0">
                  <img src={getStorageUrl(product.image_url, 80)} alt="" className="w-full h-full object-cover" width={40} height={40} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatPrice(product.price)} × {form.qty}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setForm(f => ({ ...f, qty: Math.max(1, f.qty - 1) }))} className="w-6 h-6 rounded bg-secondary text-xs font-bold">-</button>
                  <span className="w-4 text-center text-xs font-medium">{form.qty}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, qty: f.qty + 1 }))} className="w-6 h-6 rounded bg-secondary text-xs font-bold">+</button>
                </div>
              </div>

              {/* Step 1: Choix du service */}
              <fieldset>
                <legend className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">1. Service de livraison *</legend>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setService("yalidine")}
                    className={`p-3 rounded-lg border text-left transition-all ${service === "yalidine" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                    <p className="font-heading font-bold text-xs">📦 Yalidine</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Couverture nationale</p>
                  </button>
                  <button type="button" onClick={() => setService("zr")}
                    className={`p-3 rounded-lg border text-left transition-all ${service === "zr" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                    <p className="font-heading font-bold text-xs">🚚 ZR Express</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Livraison rapide</p>
                  </button>
                </div>
              </fieldset>

              {service && (
                <>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Nom complet *</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmed Benali"
                      className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" required maxLength={100} autoComplete="name" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Téléphone *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">+213</span>
                      <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))}
                        placeholder="0770 12 34 56" className="w-full h-9 rounded-lg bg-secondary border border-border pl-11 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" required maxLength={10} autoComplete="tel" />
                    </div>
                  </div>

                  {/* Step 2: Wilaya (filtree par service) */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">2. Wilaya *</label>
                    {loadingLocations ? (
                      <div className="h-9 rounded-lg bg-secondary border border-border flex items-center px-3 text-xs text-muted-foreground">
                        <Loader2 size={12} className="animate-spin me-2" /> Chargement...
                      </div>
                    ) : (
                      <select value={form.wilayaId} onChange={e => {
                        const list = service === "yalidine" ? yalidineWilayas : zrTerritories;
                        const sel = list.find(w => String(w.id) === e.target.value);
                        setForm(f => ({ ...f, wilayaId: e.target.value, wilayaName: sel?.name || "", communeName: "", deliveryType: "" }));
                      }} className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" required>
                        <option value="">{t("checkout.selectWilaya")}</option>
                        {(service === "yalidine" ? yalidineWilayas : zrTerritories).map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    )}
                    {apiError && <p className="text-[10px] text-destructive mt-1">{apiError}</p>}
                  </div>

                  {/* Commune */}
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Commune *</label>
                    {service === "yalidine" && yalidineCommunes.length > 0 ? (
                      <select value={form.communeName} onChange={e => setForm(f => ({ ...f, communeName: e.target.value }))}
                        className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" required>
                        <option value="">Choisir...</option>
                        {yalidineCommunes.map(c => <option key={c.id} value={c.name}>{c.name}{c.has_stop_desk ? " 📦" : ""}</option>)}
                      </select>
                    ) : service === "zr" && zrCommunes.length > 0 ? (
                      <select value={form.communeName} onChange={e => setForm(f => ({ ...f, communeName: e.target.value }))}
                        className="w-full h-9 rounded-lg bg-secondary border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" required>
                        <option value="">Choisir...</option>
                        {zrCommunes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={form.communeName} onChange={e => setForm(f => ({ ...f, communeName: e.target.value }))}
                        placeholder="Centre" className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" required maxLength={100} />
                    )}
                  </div>


                  {/* Step 3: Type livraison + tarifs */}
                  {form.wilayaId && (
                    <fieldset>
                      <legend className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        3. Type de livraison {loadingRates && <Loader2 size={10} className="inline animate-spin ms-1" />}
                      </legend>
                      <div className="space-y-1.5">
                        {rates && rates.home > 0 && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, deliveryType: "domicile" }))}
                            className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all ${form.deliveryType === "domicile" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">🏠 Domicile</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-heading font-bold text-primary">{formatPrice(rates.home)}</span>
                                {form.deliveryType === "domicile" && <Check size={12} className="text-primary" />}
                              </div>
                            </div>
                          </button>
                        )}
                        {rates && rates.desk > 0 && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, deliveryType: "bureau" }))}
                            className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all ${form.deliveryType === "bureau" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">📦 Bureau (Stop Desk)</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-heading font-bold text-primary">{formatPrice(rates.desk)}</span>
                                {form.deliveryType === "bureau" && <Check size={12} className="text-primary" />}
                              </div>
                            </div>
                          </button>
                        )}
                        {!loadingRates && !rates && form.communeName && (
                          <p className="text-[10px] text-amber-500">Aucun tarif disponible pour cette zone.</p>
                        )}
                      </div>
                    </fieldset>
                  )}

                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Note (optionnel)</label>
                    <input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" maxLength={500} placeholder="Instructions..." />
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-md p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Sous-total</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Livraison</span><span>{deliveryFee > 0 ? formatPrice(deliveryFee) : "—"}</span></div>
              <div className="flex items-center justify-between font-heading font-bold text-sm pt-1.5 border-t border-border"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div>
              <Button type="submit" disabled={loading || !isValid} className="w-full h-11 font-heading text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50">
                {loading ? <><Loader2 size={14} className="animate-spin me-2" /> Envoi...</> : `✅ Confirmer · ${formatPrice(total)}`}
              </Button>
              <p className="text-[9px] text-center text-muted-foreground">💳 Paiement à la livraison</p>
              {!isValid && missing.length > 0 && (
                <p className="text-[10px] text-center text-amber-500">Manque: {missing.join(", ")}</p>
              )}
            </div>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Check size={32} className="text-primary" />
            </motion.div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">Commande {orderNumber} reçue !</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs text-center">L'admin va vous appeler pour confirmer votre commande. Merci !</p>
            <div className="w-full p-3 rounded-lg bg-secondary/50 border border-border text-left text-xs space-y-1 mb-4">
              <p><span className="text-muted-foreground">Produit:</span> {product.name} × {form.qty}</p>
              <p><span className="text-muted-foreground">Service:</span> {service === "yalidine" ? "Yalidine" : "ZR Express"} {form.deliveryType === "bureau" ? "Bureau" : "Domicile"}</p>
              <p className="font-heading font-bold pt-1 border-t border-border"><span className="text-muted-foreground font-normal">Total:</span> {formatPrice(total)}</p>
            </div>
            <div className="flex flex-col gap-2.5 w-full">
              <Button asChild className="h-10 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-heading text-sm">
                <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} className="me-2" /> Messenger
                </a>
              </Button>
              <Button variant="outline" onClick={onClose} className="h-10 rounded-xl border-border text-sm">Continuer mes achats</Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
