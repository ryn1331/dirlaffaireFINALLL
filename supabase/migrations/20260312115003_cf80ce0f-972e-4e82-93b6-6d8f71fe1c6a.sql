ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS apply_to text NOT NULL DEFAULT 'all';
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS product_ids uuid[] DEFAULT '{}';