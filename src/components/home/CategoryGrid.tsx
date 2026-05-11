import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import beauteHero from "@/assets/categories/cat-beaute-hero.jpg";
import santeHero from "@/assets/categories/cat-sante-hero.jpg";

const mainCategories = [
  {
    title: "Beauté & Cosmétiques",
    description: "Sublimez votre peau avec des soins naturels et premium",
    image: beauteHero,
    universe: "beaute",
    subcategories: [
      { label: "Soins du visage", slug: "soins-visage" },
      { label: "Soins du corps", slug: "soins-corps" },
      { label: "Cheveux", slug: "cheveux" },
      { label: "Ongles", slug: "ongles" },
      { label: "Anti-âge", slug: "anti-age" },
      { label: "Collagène", slug: "collagene" },
      { label: "Éclat & Teint", slug: "eclat-teint" },
    ],
  },
  {
    title: "Santé & Compléments",
    description: "Renforcez votre corps de l'intérieur avec des compléments certifiés",
    image: santeHero,
    universe: "sante",
    subcategories: [
      { label: "Immunité", slug: "immunite" },
      { label: "Stress & Sommeil", slug: "stress" },
      { label: "Énergie", slug: "energie" },
      { label: "Cerveau & Focus", slug: "cerveau" },
      { label: "Os & Articulations", slug: "os" },
      { label: "Cœur", slug: "coeur" },
      { label: "Hormones", slug: "hormones" },
      { label: "Perte de poids", slug: "perte-de-poids" },
      { label: "Muscles", slug: "muscles" },
      { label: "Digestion", slug: "digestion" },
      { label: "Détox", slug: "detox" },
      { label: "Multivitamines", slug: "multivitamines" },
    ],
  },
];

export default function CategoryGrid() {
  return (
    <section id="categories" className="py-10 md:py-16 bg-background" aria-label="Nos univers">
      <div className="container">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-body mb-2">Nos univers</p>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
            Trouvez ce qu'il vous faut
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {mainCategories.map((cat) => (
            <div
              key={cat.title}
              className="group relative rounded-3xl overflow-hidden bg-card border border-border/40 hover:shadow-2xl hover:shadow-foreground/5 transition-all duration-500"
            >
              {/* Hero image */}
              <div className="relative h-[220px] md:h-[280px] overflow-hidden">
                <img
                  src={cat.image}
                  alt=""
                  role="presentation"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={1024}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                  <h3 className="font-heading text-xl md:text-2xl font-bold text-background mb-1.5">
                    {cat.title}
                  </h3>
                  <p className="text-background/60 text-xs md:text-sm font-body leading-relaxed max-w-[280px]">
                    {cat.description}
                  </p>
                </div>
              </div>

              {/* Subcategories */}
              <div className="p-4 md:p-6">
                <div className="flex flex-wrap gap-2">
                  {cat.subcategories.map((sub) => (
                    <Link
                      key={sub.label}
                      to={`/catalogue?univers=${cat.universe}&cat=${sub.slug}`}
                      className="px-3.5 py-1.5 rounded-full text-xs font-body font-medium bg-secondary/60 text-muted-foreground hover:bg-foreground hover:text-background transition-all duration-200"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
                <Link
                  to={`/catalogue?univers=${cat.universe}`}
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-body font-medium text-foreground hover:text-muted-foreground transition-colors group/link"
                >
                  Voir la collection
                  <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
