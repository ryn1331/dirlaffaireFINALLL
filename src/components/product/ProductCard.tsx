import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice, getStorageUrl, type DbProduct } from "@/types/database";

interface ProductCardProps {
  product: DbProduct;
  index?: number;
}

const ProductCard = React.memo(({ product, index = 0 }: ProductCardProps) => {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <article className="animate-in fade-in duration-300" style={{ animationDelay: `${index * 40}ms` }}>
      <Link
        to={`/produit/${product.id}`}
        className="block rounded-2xl border border-border/50 bg-card overflow-hidden card-hover group"
        aria-label={`${product.name} — ${formatPrice(product.price)}`}
      >
        <div className="aspect-square bg-[radial-gradient(circle_at_60%_40%,hsl(var(--secondary)/0.6),hsl(var(--background))_70%)] overflow-hidden relative">
          <img
            src={getStorageUrl(product.image_url, 400)}
            alt={product.name}
            className={`w-full h-full object-contain p-3 transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            width={400}
            height={400}
            decoding="async"
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
          {product.is_promo && (
            <span className="absolute top-2.5 start-2.5 badge-promo">Promo</span>
          )}
          {product.is_top_sale && (
            <span className="absolute top-2.5 end-2.5 badge-top">Populaire</span>
          )}
        </div>
        <div className="p-3 md:p-4">
          {product.objectives && product.objectives.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {product.objectives.slice(0, 2).map(obj => (
                <span key={obj} className="badge-category">{obj}</span>
              ))}
            </div>
          )}
          <h3 className="font-body font-medium text-sm text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-heading font-bold text-foreground text-base">{formatPrice(product.price)}</span>
            {product.old_price && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.old_price)}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
});

ProductCard.displayName = "ProductCard";
export default ProductCard;
