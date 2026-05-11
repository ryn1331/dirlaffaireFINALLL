CREATE OR REPLACE VIEW public.products_public AS
SELECT id, price, old_price, rating, reviews_count, in_stock, is_promo, is_top_sale,
       nutrition_facts, created_at, updated_at, flavors, weights, objectives,
       name, brand, category, description, usage_instructions, conseils,
       image_url, gallery, expiration_date, stock_qty
FROM products;