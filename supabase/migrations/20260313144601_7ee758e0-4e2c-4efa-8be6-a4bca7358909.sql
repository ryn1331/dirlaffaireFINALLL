CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE products
  SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - p_quantity)
  WHERE id = p_product_id;
END;
$$;