import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery session from URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      // Supabase handles session automatically from the hash
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères"); return; }
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Mot de passe mis à jour !");
      setTimeout(() => navigate("/admin"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {success ? "✅ Mot de passe mis à jour" : "Nouveau mot de passe"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {success ? "Redirection vers le tableau de bord..." : "Choisissez un nouveau mot de passe"}
          </p>
        </div>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nouveau mot de passe</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full h-12 rounded-xl bg-card border border-border px-4 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirmer le mot de passe</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-base rounded-xl">
              {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Mise à jour...</> : "Mettre à jour le mot de passe"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
