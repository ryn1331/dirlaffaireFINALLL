
-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage RLS policies
CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Auth users can upload product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Auth users can update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Auth users can delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');
