-- Full restore script for the target Supabase project.
-- Covers the complete schema visible in this repository, plus known seeds and RLS policies.
-- It intentionally excludes private source data that cannot be read without source-admin access.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  brand text NOT NULL,
  category text NOT NULL,
  objectives text[] DEFAULT '{}',
  price integer NOT NULL,
  old_price integer,
  image_url text,
  gallery text[] DEFAULT '{}',
  flavors text[] DEFAULT '{}',
  weights text[] DEFAULT '{}',
  description text,
  nutrition_facts jsonb DEFAULT '[]'::jsonb,
  in_stock boolean DEFAULT true,
  is_top_sale boolean DEFAULT false,
  is_promo boolean DEFAULT false,
  rating numeric(2,1) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  usage_instructions text,
  conseils text,
  expiration_date date,
  stock_qty integer DEFAULT 0,
  cost_price integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.packs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  old_price integer,
  image_url text,
  active boolean DEFAULT true,
  duration text,
  stock_qty integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Packs are viewable by everyone" ON public.packs;
DROP POLICY IF EXISTS "Only admins can insert packs" ON public.packs;
DROP POLICY IF EXISTS "Only admins can update packs" ON public.packs;
DROP POLICY IF EXISTS "Only admins can delete packs" ON public.packs;
CREATE POLICY "Packs are viewable by everyone" ON public.packs FOR SELECT USING (true);
CREATE POLICY "Admins insert packs" ON public.packs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update packs" ON public.packs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete packs" ON public.packs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_packs_updated_at ON public.packs;
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON public.packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pack_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id uuid NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer DEFAULT 1
);
ALTER TABLE public.pack_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pack items are viewable by everyone" ON public.pack_items;
DROP POLICY IF EXISTS "Only admins can manage pack items" ON public.pack_items;
CREATE POLICY "Pack items are viewable by everyone" ON public.pack_items FOR SELECT USING (true);
CREATE POLICY "Admins manage pack items" ON public.pack_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1000;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  wilaya text NOT NULL,
  commune text NOT NULL,
  address text NOT NULL,
  delivery_type text NOT NULL DEFAULT 'domicile',
  delivery_fee integer DEFAULT 600,
  notes text,
  subtotal integer NOT NULL,
  total integer NOT NULL,
  status text NOT NULL DEFAULT 'En préparation',
  service_livraison text DEFAULT 'world_express_domicile',
  tracking_number text,
  shipping_label_url text,
  shipping_created_at timestamptz,
  shipping_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders viewable by admins" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'CMD-' || LPAD(NEXTVAL('public.order_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();
DROP TRIGGER IF EXISTS validate_order_before_insert ON public.orders;
CREATE OR REPLACE FUNCTION public.validate_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TRIM(COALESCE(NEW.client_name, '')) = '' THEN
    RAISE EXCEPTION 'client_name cannot be empty';
  END IF;
  IF LENGTH(TRIM(COALESCE(NEW.client_phone, ''))) < 10 THEN
    RAISE EXCEPTION 'client_phone must be at least 10 characters';
  END IF;
  IF TRIM(COALESCE(NEW.wilaya, '')) = '' THEN
    RAISE EXCEPTION 'wilaya cannot be empty';
  END IF;
  IF TRIM(COALESCE(NEW.address, '')) = '' THEN
    RAISE EXCEPTION 'address cannot be empty';
  END IF;
  IF NEW.total <= 0 THEN
    RAISE EXCEPTION 'total must be positive';
  END IF;
  IF NEW.subtotal <= 0 THEN
    RAISE EXCEPTION 'subtotal must be positive';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_order_before_insert BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order();
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders(tracking_number) WHERE tracking_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text NOT NULL,
  flavor text,
  weight text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  total_price integer NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Order items viewable by admins" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Admins view order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  wilaya text,
  orders_count integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clients viewable by admins" ON public.clients;
DROP POLICY IF EXISTS "Anyone can create clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
CREATE POLICY "Admins view clients" ON public.clients FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.promos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  discount integer NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  products_count integer DEFAULT 0,
  start_date date,
  end_date date,
  active boolean DEFAULT true,
  apply_to text NOT NULL DEFAULT 'all',
  product_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Promos viewable by everyone" ON public.promos;
DROP POLICY IF EXISTS "Only admins can manage promos" ON public.promos;
CREATE POLICY "Promos viewable by everyone" ON public.promos FOR SELECT USING (true);
CREATE POLICY "Admins manage promos" ON public.promos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_promos_updated_at ON public.promos;
CREATE TRIGGER update_promos_updated_at BEFORE UPDATE ON public.promos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  has_yalidine boolean NOT NULL DEFAULT true,
  has_zr_express boolean NOT NULL DEFAULT false,
  yalidine_bureau_price integer NOT NULL DEFAULT 600,
  yalidine_domicile_price integer NOT NULL DEFAULT 800,
  zr_bureau_price integer NOT NULL DEFAULT 700,
  zr_domicile_price integer NOT NULL DEFAULT 900,
  remote_price integer NOT NULL DEFAULT 1200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Delivery zones viewable by everyone" ON public.delivery_zones;
DROP POLICY IF EXISTS "Only admins can insert delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Only admins can update delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Only admins can delete delivery zones" ON public.delivery_zones;
CREATE POLICY "Delivery zones viewable by everyone" ON public.delivery_zones FOR SELECT TO public USING (true);
CREATE POLICY "Admins insert delivery zones" ON public.delivery_zones FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update delivery zones" ON public.delivery_zones FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete delivery zones" ON public.delivery_zones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS update_delivery_zones_updated_at ON public.delivery_zones;
CREATE TRIGGER update_delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings viewable by everyone" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can insert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.site_settings;
CREATE POLICY "Settings viewable by everyone" ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admins insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin@admin.fr'
ON CONFLICT DO NOTHING;

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

DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

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
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

INSERT INTO public.delivery_zones (code, name, has_yalidine, has_zr_express) VALUES
('01','Adrar',true,false),('02','Chlef',true,true),('03','Laghouat',true,false),
('04','Oum El Bouaghi',true,true),('05','Batna',true,true),('06','Béjaïa',true,true),
('07','Biskra',true,true),('08','Béchar',true,false),('09','Blida',true,true),
('10','Bouira',true,true),('11','Tamanrasset',true,false),('12','Tébessa',true,true),
('13','Tlemcen',true,true),('14','Tiaret',true,true),('15','Tizi Ouzou',true,true),
('16','Alger',true,true),('17','Djelfa',true,true),('18','Jijel',true,true),
('19','Sétif',true,true),('20','Saïda',true,true),('21','Skikda',true,true),
('22','Sidi Bel Abbès',true,true),('23','Annaba',true,true),('24','Guelma',true,true),
('25','Constantine',true,true),('26','Médéa',true,true),('27','Mostaganem',true,true),
('28','M''Sila',true,true),('29','Mascara',true,true),('30','Ouargla',true,false),
('31','Oran',true,true),('32','El Bayadh',true,false),('33','Illizi',false,false),
('34','Bordj Bou Arréridj',true,true),('35','Boumerdès',true,true),('36','El Tarf',true,true),
('37','Tindouf',true,false),('38','Tissemsilt',true,true),('39','El Oued',true,false),
('40','Khenchela',true,true),('41','Souk Ahras',true,true),('42','Tipaza',true,true),
('43','Mila',true,true),('44','Aïn Defla',true,true),('45','Naâma',true,false),
('46','Aïn Témouchent',true,true),('47','Ghardaïa',true,false),('48','Relizane',true,true),
('49','El M''Ghair',true,false),('50','El Meniaa',true,false),('51','Ouled Djellal',true,false),
('52','Bordj Badji Mokhtar',false,false),('53','Béni Abbès',false,false),
('54','Timimoun',false,false),('55','Touggourt',true,false),('56','Djanet',false,false),
('57','In Salah',false,false),('58','In Guezzam',false,false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('store_name', 'Vitaluxyne'),
  ('email', 'contact@vitaluxyne.com'),
  ('phone', '0555 12 34 56'),
  ('whatsapp', '+213555123456'),
  ('address', 'Alger, Algérie'),
  ('instagram', '@vitaluxyne'),
  ('facebook', 'facebook.com/vitaluxyne'),
  ('delivery_fee_home', '600'),
  ('delivery_fee_relay', '0')
ON CONFLICT (key) DO NOTHING;
