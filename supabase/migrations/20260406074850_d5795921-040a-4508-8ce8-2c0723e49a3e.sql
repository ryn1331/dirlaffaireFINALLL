
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  has_world_express boolean NOT NULL DEFAULT true,
  has_swift_express boolean NOT NULL DEFAULT false,
  swift_bureau_price integer NOT NULL DEFAULT 600,
  swift_domicile_price integer NOT NULL DEFAULT 800,
  world_bureau_price integer NOT NULL DEFAULT 700,
  world_domicile_price integer NOT NULL DEFAULT 900,
  remote_price integer NOT NULL DEFAULT 1200,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery zones viewable by everyone"
ON public.delivery_zones FOR SELECT
TO public USING (true);

CREATE POLICY "Only admins can insert delivery zones"
ON public.delivery_zones FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Only admins can update delivery zones"
ON public.delivery_zones FOR UPDATE
TO authenticated USING (true);

CREATE POLICY "Only admins can delete delivery zones"
ON public.delivery_zones FOR DELETE
TO authenticated USING (true);

CREATE TRIGGER update_delivery_zones_updated_at
BEFORE UPDATE ON public.delivery_zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current hardcoded data
INSERT INTO public.delivery_zones (code, name, has_world_express, has_swift_express) VALUES
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
('57','In Salah',false,false),('58','In Guezzam',false,false);
