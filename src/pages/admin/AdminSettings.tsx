import { Store, Truck, Globe, Save, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auth fields
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authSaving, setAuthSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings" as any).select("key, value");
      const s: Record<string, string> = {};
      (data as any[])?.forEach((r: any) => { s[r.key] = r.value; });
      setSettings(s);
      setLoading(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setNewEmail(user.email);
    })();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from("site_settings" as any).upsert({ key, value, updated_at: new Date().toISOString() } as any, { onConflict: "key" });
      }
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Paramètres sauvegardés !");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return toast.error("Email requis");
    setAuthSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setAuthSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Un email de confirmation a été envoyé à la nouvelle adresse");
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) return toast.error("Remplissez tous les champs");
    if (newPassword.length < 6) return toast.error("Le mot de passe doit contenir au moins 6 caractères");
    if (newPassword !== confirmPassword) return toast.error("Les mots de passe ne correspondent pas");
    setAuthSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setAuthSaving(false);
    if (error) return toast.error(error.message);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Mot de passe modifié avec succès");
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const Field = ({ label, settingKey, type = "text", maxLength = 100 }: { label: string; settingKey: string; type?: string; maxLength?: number }) => (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        value={settings[settingKey] || ""}
        onChange={e => updateSetting(settingKey, e.target.value)}
        className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        maxLength={maxLength}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Store Info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Store size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-base">Informations boutique</h3>
        </div>
        <div className="space-y-3">
          <Field label="Nom de la boutique" settingKey="store_name" />
          <Field label="Email de contact" settingKey="email" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Téléphone" settingKey="phone" maxLength={20} />
            <Field label="Messenger" settingKey="whatsapp" maxLength={20} />
          </div>
          <Field label="Adresse" settingKey="address" maxLength={200} />
        </div>
      </div>

      {/* Delivery */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-base">Livraison</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frais livraison domicile (DA)" settingKey="delivery_fee_home" type="number" />
          <Field label="Frais point relais (DA)" settingKey="delivery_fee_relay" type="number" />
        </div>
      </div>

      {/* Social */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-base">Réseaux sociaux</h3>
        </div>
        <div className="space-y-3">
          <Field label="Instagram" settingKey="instagram" />
          <Field label="Facebook" settingKey="facebook" maxLength={200} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground font-heading h-11 px-6">
        <Save size={16} className="mr-2" /> {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
      </Button>

      {/* Email Change */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-base">Changer l'email admin</h3>
        </div>
        <p className="text-xs text-muted-foreground">Un email de confirmation sera envoyé à la nouvelle adresse.</p>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nouvel email</label>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button onClick={handleEmailChange} disabled={authSaving} variant="outline" className="font-heading">
          <Mail size={14} className="mr-2" /> Changer l'email
        </Button>
      </div>

      {/* Password Change */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-base">Changer le mot de passe</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              minLength={6}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-10 rounded-md bg-secondary border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              minLength={6}
            />
          </div>
        </div>
        <Button onClick={handlePasswordChange} disabled={authSaving} variant="outline" className="font-heading">
          <Lock size={14} className="mr-2" /> Changer le mot de passe
        </Button>
      </div>
    </div>
  );
}
