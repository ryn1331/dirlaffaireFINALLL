ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT 0;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT 0;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS duration text DEFAULT null;