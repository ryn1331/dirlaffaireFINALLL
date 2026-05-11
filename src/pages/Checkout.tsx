import { useState, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { useLang } from "@/context/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { formatPrice, getStorageUrl } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Check, MapPin, User, Truck, Phone, Loader2, ChevronDown, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDeliveryZones, getDeliveryOptionsFromZone } from "@/hooks/useDeliveryZones";
import { trackPurchase, trackInitiateCheckout } from "@/lib/metaPixel";
import { MESSENGER_URL } from "@/lib/messenger";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { t } = useLang();
  const { data: settings } = useSiteSettings();
  const { data: zones = [] } = useDeliveryZones();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ number: string; total: number } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", wilaya: "", commune: "", address: "", delivery: "", notes: "" });
  const navigate = useNavigate();

  const selectedZone = zones.find(z => z.name === form.wilaya);
  const deliveryOptions = useMemo(() => selectedZone ? getDeliveryOptionsFromZone(selectedZone) : [], [selectedZone]);
  const selectedDelivery = deliveryOptions.find(o => o.id === form.delivery);
  const deliveryFee = selectedDelivery?.price || 0;
  const grandTotal = total + deliveryFee;

  const update = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));
  const handleWilayaChange = (w: string) => {
    const zone = zones.find(z => z.name === w);
    const opts = zone ? getDeliveryOptionsFromZone(zone) : [];
    setForm(f => ({ ...f, wilaya: w, delivery: opts[0]?.id || "" }));
  };

  const canProceed = step === 1 ? form.name && form.phone.length >= 10 && form.wilaya && form.commune && form.address : step === 2 ? !!form.delivery : true;

  const handleConfirm = async () => {
    if (submitting) return; // double-submit guard
    setSubmitting(true);
    trackInitiateCheckout(grandTotal, items.length);
    try {
      const orderId = crypto.randomUUID();
      const phone = form.phone.startsWith("0") ? form.phone : `0${form.phone}`;
      const { error } = await supabase.from("orders").insert({
        id: orderId,
        order_number: "TEMP", client_name: form.name.trim().slice(0, 100), client_phone: phone.slice(0, 15),
        wilaya: form.wilaya, commune: form.commune.trim().slice(0, 100), address: form.address.trim().slice(0, 200),
        delivery_type: selectedDelivery?.type || "domicile", delivery_fee: deliveryFee,
        service_livraison: form.delivery, subtotal: total, total: grandTotal,
        notes: form.notes.trim().slice(0, 300) || null, status: "En préparation",
      });

      if (error) throw error;

      const orderItems = items.map(item => ({
        order_id: orderId, product_name: item.name, product_id: item.productId,
        flavor: item.flavor, weight: item.weight, quantity: item.quantity,
        unit_price: item.price, total_price: item.price * item.quantity,
      }));
      await supabase.from("order_items").insert(orderItems as any);
      // Stock is NOT decremented here - only when admin confirms the order
      await supabase.from("clients").upsert({ name: form.name.trim().slice(0, 100), phone: phone.slice(0, 15), wilaya: form.wilaya }, { onConflict: "phone" });

      const clientRef = `CMD-${orderId.slice(0, 6).toUpperCase()}`;
      setOrderResult({ number: clientRef, total: grandTotal });
      trackPurchase(grandTotal, clientRef);
      clearCart();
      setStep(4);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !orderResult) {
    return (
      <div className="container py-20 text-center min-h-screen">
        <p className="text-muted-foreground mb-4">{t("checkout.emptyCart")}</p>
        <Button onClick={() => navigate("/catalogue")} className="gradient-primary text-primary-foreground">{t("cart.viewCatalog")}</Button>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10 min-h-screen max-w-2xl mx-auto pb-24">
      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-6">{t("checkout.title")}</h1>

      {/* Steps indicator */}
      {step <= 3 && (
        <div className="flex items-center gap-2 mb-8">
          {[{ id: 1, label: t("checkout.info"), icon: User }, { id: 2, label: t("checkout.delivery"), icon: Truck }, { id: 3, label: t("checkout.confirm"), icon: Check }].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${step === s.id ? "gradient-primary text-primary-foreground" : step > s.id ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {step > s.id ? <Check size={12} /> : <Icon size={12} />}
                  <span>{s.label}</span>
                </div>
                {i < 2 && <div className="w-4 md:w-8 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>
      )}

      {step === 4 && orderResult ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-2">Commande {orderResult.number} reçue !</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">L'admin va vous appeler pour confirmer votre commande. Merci !</p>
          <div className="max-w-sm mx-auto p-4 rounded-xl bg-secondary/50 border border-border text-sm space-y-1 mb-6 text-left">
            <p><span className="text-muted-foreground">Livraison:</span> {selectedDelivery?.label}</p>
            <p className="font-heading font-bold"><span className="text-muted-foreground font-normal">Total:</span> {formatPrice(orderResult.total)}</p>
          </div>
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Button asChild className="h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-heading">
              <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} className="me-2" /> Contacter sur Messenger
              </a>
            </Button>
            <Button variant="outline" onClick={() => navigate("/catalogue")} className="h-11 rounded-xl">Continuer mes achats</Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  <h2 className="font-heading text-lg font-bold">{t("checkout.yourInfo")}</h2>
                  <div>
                    <label htmlFor="ck-name" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{t("checkout.fullName")} *</label>
                    <input id="ck-name" placeholder={t("checkout.fullName")} value={form.name} onChange={e => update("name", e.target.value)} className="field-input" maxLength={100} autoComplete="name" />
                  </div>
                  <div>
                    <label htmlFor="ck-phone" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Téléphone *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium" aria-hidden="true">+213</span>
                      <input id="ck-phone" placeholder="0770 12 34 56" value={form.phone} onChange={e => update("phone", e.target.value.replace(/[^\d]/g, "").slice(0, 10))} type="tel" className="field-input !pl-12" maxLength={10} autoComplete="tel" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ck-wilaya" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Wilaya *</label>
                    <div className="relative">
                      <select id="ck-wilaya" value={form.wilaya} onChange={e => handleWilayaChange(e.target.value)} className="field-input appearance-none pr-8">
                        <option value="">{t("checkout.selectWilaya")}</option>
                        {zones.map(w => <option key={w.code} value={w.name}>{w.code} - {w.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ck-commune" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Commune *</label>
                    <input id="ck-commune" placeholder={t("checkout.commune")} value={form.commune} onChange={e => update("commune", e.target.value)} className="field-input" maxLength={100} autoComplete="address-level2" />
                  </div>
                  <div>
                    <label htmlFor="ck-address" className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Adresse *</label>
                    <input id="ck-address" placeholder={t("checkout.address")} value={form.address} onChange={e => update("address", e.target.value)} className="field-input" maxLength={200} autoComplete="street-address" />
                  </div>
                  <div>
                    <label htmlFor="ck-notes" className="text-[10px] text-muted-foreground mb-1 block">Note (optionnel)</label>
                    <textarea id="ck-notes" placeholder={t("checkout.notes")} value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="field-input !h-auto resize-none py-3" maxLength={300} />
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  <h2 className="font-heading text-lg font-bold">{t("checkout.deliveryMode")}</h2>
                  {deliveryOptions.map(opt => (
                    <button key={opt.id} onClick={() => update("delivery", opt.id)} className={`w-full p-4 rounded-xl border text-left transition-all ${form.delivery === opt.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{opt.type === "bureau" ? "📦" : "🏠"} {opt.label}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.type === "bureau" ? "Retrait en bureau (moins cher)" : "Livraison à votre porte"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-primary">{formatPrice(opt.price)}</span>
                          {form.delivery === opt.id && <Check size={16} className="text-primary" />}
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-1"><span className="text-sm">💳</span><span className="font-medium text-sm">{t("checkout.codPayment")}</span></div>
                    <p className="text-xs text-muted-foreground">{t("checkout.codDesc")}</p>
                  </div>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  <h2 className="font-heading text-lg font-bold">{t("checkout.confirmOrder")}</h2>
                  <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{t("checkout.name")}</span> {form.name}</p>
                    <p><span className="text-muted-foreground">{t("checkout.phoneLabel")}</span> +213 {form.phone}</p>
                    <p><span className="text-muted-foreground">{t("checkout.addressLabel")}</span> {form.address}, {form.commune}, {form.wilaya}</p>
                    <p><span className="text-muted-foreground">{t("checkout.deliveryLabel")}</span> {selectedDelivery?.label || "—"}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-1"><Phone size={14} className="text-primary" /><span className="text-sm font-medium">{t("checkout.messengerConfirm")}</span></div>
                    <p className="text-xs text-muted-foreground">{t("checkout.messengerDesc")}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 mt-6">
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="border-border rounded-xl">{t("checkout.back")}</Button>}
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground disabled:opacity-50">{t("checkout.next")}</Button>
              ) : (
                <Button onClick={handleConfirm} disabled={submitting} className="flex-1 h-12 font-heading text-base rounded-xl gradient-primary text-primary-foreground hover:opacity-90">
                  {submitting ? <Loader2 size={18} className="animate-spin me-2" /> : "✅"} {t("checkout.confirmOrder")}
                </Button>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-card border border-border rounded-xl p-4 h-fit sticky top-20">
            <h3 className="font-heading font-bold mb-3 text-sm">{t("checkout.summary")}</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={`${item.productId}-${item.flavor}-${item.weight}`} className="flex gap-2">
                  <img src={getStorageUrl(item.imageUrl, 80)} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.flavor} · {item.weight} · x{item.quantity}</p>
                    <p className="text-xs font-heading font-bold text-primary">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.subtotal")}</span><span>{formatPrice(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.deliveryFee")}</span><span>{deliveryFee > 0 ? formatPrice(deliveryFee) : "—"}</span></div>
              <div className="flex justify-between font-heading font-bold text-base pt-2 border-t border-border mt-2">
                <span>{t("cart.total")}</span><span className="text-primary">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
