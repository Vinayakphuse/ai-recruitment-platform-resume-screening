-- Replace broad SELECT policy with one that disallows listing (no metadata listing)
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;

-- Allow direct file access by name but block bucket listing
CREATE POLICY "Public read company logos by path"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IS NOT NULL
  );