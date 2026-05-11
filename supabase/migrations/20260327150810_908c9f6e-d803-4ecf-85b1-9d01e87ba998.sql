
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings viewable by everyone" ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Only admins can update settings" ON public.site_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (true);

INSERT INTO public.site_settings (key, value) VALUES
  ('store_name', 'Vitaluxyne'),
  ('email', 'contact@vitaluxyne.com'),
  ('phone', '0555 12 34 56'),
  ('whatsapp', '+213555123456'),
  ('address', 'Alger, Algérie'),
  ('instagram', '@vitaluxyne'),
  ('facebook', 'facebook.com/vitaluxyne'),
  ('delivery_fee_home', '600'),
  ('delivery_fee_relay', '0');
