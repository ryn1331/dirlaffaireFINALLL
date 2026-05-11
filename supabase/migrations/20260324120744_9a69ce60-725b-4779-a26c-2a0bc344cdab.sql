
-- Create a public view for products that hides cost_price and stock_qty
CREATE VIEW public.products_public
WITH (security_invoker=on) AS
  SELECT id, name, brand, category, description, price, old_price, image_url, 
         flavors, weights, objectives, rating, reviews_count, is_promo, is_top_sale, 
         in_stock, nutrition_facts, usage_instructions, conseils, created_at, updated_at
  FROM public.products;

-- Grant SELECT on view to anon and authenticated
GRANT SELECT ON public.products_public TO anon, authenticated;
