
-- ============================================================
-- AUDIT SÉCURITÉ CRITIQUE — Phase 1
-- 1. Système de rôles admin (table séparée + has_role)
-- 2. Durcissement RLS (remplace toutes les policies "true")
-- 3. Masquage cost_price (donnée business sensible)
-- 4. Restriction storage product-images aux admins
-- 5. Révocation EXECUTE sur fonctions SECURITY DEFINER
-- ============================================================

-- 1. ROLES SYSTEM
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assign admin to existing admin user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin@admin.fr'
ON CONFLICT DO NOTHING;

-- 2. PRODUCTS — admin-only writes + hide cost_price
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Column-level: hide cost_price from anon and non-admins
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;

-- Recreate products_public view as SECURITY INVOKER (no cost_price)
DROP VIEW IF EXISTS public.products_public CASCADE;
CREATE VIEW public.products_public
WITH (security_invoker = true)
AS SELECT
  id, name, brand, category, price, old_price, image_url, gallery,
  flavors, weights, description, nutrition_facts, in_stock, is_top_sale, is_promo,
  rating, reviews_count, stock_qty, usage_instructions, conseils, expiration_date,
  objectives, created_at, updated_at
FROM public.products;
GRANT SELECT ON public.products_public TO anon, authenticated;

-- 3. PACKS
DROP POLICY IF EXISTS "Only admins can insert packs" ON public.packs;
DROP POLICY IF EXISTS "Only admins can update packs" ON public.packs;
DROP POLICY IF EXISTS "Only admins can delete packs" ON public.packs;
CREATE POLICY "Admins insert packs" ON public.packs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update packs" ON public.packs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete packs" ON public.packs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage pack items" ON public.pack_items;
CREATE POLICY "Admins manage pack items" ON public.pack_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. PROMOS
DROP POLICY IF EXISTS "Only admins can manage promos" ON public.promos;
CREATE POLICY "Admins manage promos" ON public.promos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. SITE_SETTINGS
DROP POLICY IF EXISTS "Only admins can insert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.site_settings;
CREATE POLICY "Admins insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. DELIVERY_ZONES
DROP POLICY IF EXISTS "Only admins can insert delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Only admins can update delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Only admins can delete delivery zones" ON public.delivery_zones;
CREATE POLICY "Admins insert delivery zones" ON public.delivery_zones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update delivery zones" ON public.delivery_zones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete delivery zones" ON public.delivery_zones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. ORDERS / CLIENTS / ORDER_ITEMS — admin reads/updates only
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Orders viewable by admins" ON public.orders;
CREATE POLICY "Admins view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Clients viewable by admins" ON public.clients;
CREATE POLICY "Admins view clients" ON public.clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Order items viewable by admins" ON public.order_items;
CREATE POLICY "Admins view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. STORAGE: product-images — admin-only mutations
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;

CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- 9. SECURITY DEFINER functions: lock down EXECUTE
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
-- (only service_role, used in edge functions, retains EXECUTE)
