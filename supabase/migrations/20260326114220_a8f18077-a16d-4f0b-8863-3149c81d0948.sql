ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery text[] DEFAULT '{}';

DROP VIEW IF EXISTS public.products_public;

CREATE VIEW public.products_public AS
SELECT
  id, name, brand, category, description, price, old_price,
  image_url, gallery, flavors, weights, objectives,
  rating, reviews_count, in_stock, is_promo, is_top_sale,
  nutrition_facts, usage_instructions, conseils,
  created_at, updated_at
FROM public.products;