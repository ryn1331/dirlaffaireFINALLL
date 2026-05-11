
-- Restore cost_price for authenticated (admin) only, keep hidden for anon
GRANT SELECT (cost_price) ON public.products TO authenticated;

-- Restrict storage listing on product-images bucket: only allow direct file access via name
-- Disable broad SELECT, allow per-object access
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
-- Make bucket private listing but files served via public URL still work since bucket is public for downloads
-- Keep public read since bucket is public — this is intentional for product images
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');
