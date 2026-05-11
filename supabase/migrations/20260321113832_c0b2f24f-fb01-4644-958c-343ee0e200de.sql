
-- Add service_livraison column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_livraison text DEFAULT 'world_express_domicile';
