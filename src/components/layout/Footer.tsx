import { Phone, MapPin, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { data: settings } = useSiteSettings();

  const storeName = settings?.store_name || "Dir l'Affaire";
  const phone = settings?.phone || "0555 12 34 56";
  const email = settings?.email || "contact@dirlaffaire.com";
  const address = settings?.address || "Alger, Algérie";

  return (
    <footer className="bg-foreground text-background/80" role="contentinfo">
      <div className="container py-10 md:py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-heading text-xl font-bold mb-3 text-background">{storeName}</h3>
            <p className="text-xs text-background/50 leading-relaxed max-w-xs">{t("footer.desc")}</p>
          </div>
          <div>
            <h4 className="font-body font-semibold mb-3 text-xs uppercase tracking-[0.15em] text-background/40">Navigation</h4>
            <ul className="space-y-2 text-xs text-background/50">
              <li><Link to="/catalogue" className="hover:text-background transition-colors">{t("nav.catalog")}</Link></li>
              <li><Link to="/catalogue?cat=beaute" className="hover:text-background transition-colors">Beauté & Cosmétiques</Link></li>
              <li><Link to="/catalogue?cat=immunite" className="hover:text-background transition-colors">Santé & Compléments</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-body font-semibold mb-3 text-xs uppercase tracking-[0.15em] text-background/40">Info</h4>
            <ul className="space-y-2 text-xs text-background/50">
              <li>{t("footer.faq")}</li>
              <li>{t("footer.returns")}</li>
              <li>{t("footer.shipping")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-body font-semibold mb-3 text-xs uppercase tracking-[0.15em] text-background/40">Contact</h4>
            <ul className="space-y-2 text-xs text-background/50">
              <li className="flex items-center gap-2"><Phone size={12} aria-hidden="true" /> <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-background transition-colors">{phone}</a></li>
              <li className="flex items-center gap-2"><Mail size={12} aria-hidden="true" /> <a href={`mailto:${email}`} className="hover:text-background transition-colors">{email}</a></li>
              <li className="flex items-center gap-2"><MapPin size={12} aria-hidden="true" /> {address}</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-5 border-t border-background/10 text-center text-[10px] text-background/30">
          <span onClick={() => navigate("/admin/login")} className="cursor-text select-none" role="presentation">
            {t("footer.rights")}
          </span>
        </div>
      </div>
    </footer>
  );
}
