
-- Add expiration date to products
ALTER TABLE public.products ADD COLUMN expiration_date date NULL;

-- Rename delivery zone columns from Swift/World to Yalidine/ZR
ALTER TABLE public.delivery_zones RENAME COLUMN has_swift_express TO has_yalidine;
ALTER TABLE public.delivery_zones RENAME COLUMN has_world_express TO has_zr_express;
ALTER TABLE public.delivery_zones RENAME COLUMN swift_bureau_price TO yalidine_bureau_price;
ALTER TABLE public.delivery_zones RENAME COLUMN swift_domicile_price TO yalidine_domicile_price;
ALTER TABLE public.delivery_zones RENAME COLUMN world_bureau_price TO zr_bureau_price;
ALTER TABLE public.delivery_zones RENAME COLUMN world_domicile_price TO zr_domicile_price;
