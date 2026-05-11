
-- B1: Attach generate_order_number trigger to orders table
CREATE OR REPLACE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- M2: Add product_id column to order_items for reliable stock matching
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id uuid;

-- Fix products_public view
DROP VIEW IF EXISTS public.products_public;
CREATE VIEW public.products_public AS
  SELECT id, price, old_price, rating, reviews_count, in_stock, is_promo, is_top_sale,
         nutrition_facts, created_at, updated_at, flavors, weights, objectives,
         name, brand, category, description, usage_instructions, conseils,
         image_url, gallery
  FROM public.products;
