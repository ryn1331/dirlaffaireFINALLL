ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_label_url TEXT,
  ADD COLUMN IF NOT EXISTS shipping_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipping_error TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders(tracking_number) WHERE tracking_number IS NOT NULL;