
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  objectives TEXT[] DEFAULT '{}',
  price INTEGER NOT NULL,
  old_price INTEGER,
  image_url TEXT,
  flavors TEXT[] DEFAULT '{}',
  weights TEXT[] DEFAULT '{}',
  description TEXT,
  nutrition_facts JSONB DEFAULT '[]',
  in_stock BOOLEAN DEFAULT true,
  is_top_sale BOOLEAN DEFAULT false,
  is_promo BOOLEAN DEFAULT false,
  rating NUMERIC(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Only admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete products" ON public.products FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Packs table
CREATE TABLE public.packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  old_price INTEGER,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packs are viewable by everyone" ON public.packs FOR SELECT USING (true);
CREATE POLICY "Only admins can insert packs" ON public.packs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can update packs" ON public.packs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete packs" ON public.packs FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON public.packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pack items
CREATE TABLE public.pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1
);
ALTER TABLE public.pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pack items are viewable by everyone" ON public.pack_items FOR SELECT USING (true);
CREATE POLICY "Only admins can manage pack items" ON public.pack_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders table
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1000;

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  wilaya TEXT NOT NULL,
  commune TEXT NOT NULL,
  address TEXT NOT NULL,
  delivery_type TEXT NOT NULL DEFAULT 'domicile',
  delivery_fee INTEGER DEFAULT 600,
  notes TEXT,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'En préparation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders viewable by admins" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'CMD-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Order items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  flavor TEXT,
  weight TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items viewable by admins" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  wilaya TEXT,
  orders_count INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients viewable by admins" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Promos table
CREATE TABLE public.promos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  discount INTEGER NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  products_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promos viewable by everyone" ON public.promos FOR SELECT USING (true);
CREATE POLICY "Only admins can manage promos" ON public.promos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_promos_updated_at BEFORE UPDATE ON public.promos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
