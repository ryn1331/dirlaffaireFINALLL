import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Globe, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/context/LanguageContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t("admin.loginSuccess"));
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Entrez votre email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Email de réinitialisation envoyé !");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <button onClick={() => setLang(lang === "fr" ? "ar" : "fr")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <Globe size={14} /> {t("lang.switch")}
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {mode === "login" ? t("admin.loginTitle") : "Mot de passe oublié"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? t("admin.loginSub") : "Entrez votre email pour recevoir un lien de réinitialisation"}
          </p>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin.email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@dirlaffaire.com" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required maxLength={100} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin.password")}</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 rounded-xl bg-card border border-border px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required minLength={6} maxLength={50} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-base rounded-xl">
              {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Connexion...</> : t("admin.login")}
            </Button>
            <button type="button" onClick={() => setMode("forgot")} className="w-full text-center text-xs text-primary hover:underline mt-2">
              Mot de passe oublié ?
            </button>
          </form>
        ) : resetSent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">📧</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Un email a été envoyé à <strong className="text-foreground">{email}</strong>. 
              Vérifiez votre boîte de réception et suivez le lien pour réinitialiser votre mot de passe.
            </p>
            <Button variant="outline" onClick={() => { setMode("login"); setResetSent(false); }} className="rounded-xl">
              <ArrowLeft size={14} className="mr-2" /> Retour à la connexion
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@dirlaffaire.com" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required maxLength={100} />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-base rounded-xl">
              {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Envoi...</> : "Envoyer le lien"}
            </Button>
            <button type="button" onClick={() => setMode("login")} className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary mt-2">
              <ArrowLeft size={12} /> Retour à la connexion
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
