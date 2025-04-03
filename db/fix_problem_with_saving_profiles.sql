-- Corrected Supabase Storage Policies for Prayer Diary App
--
-- These SQL statements create the necessary storage bucket policies to allow
-- authenticated users to manage their profile pictures, even before admin approval.
-- Run these statements in your Supabase SQL Editor.

-- Allow authenticated users to upload their profile pictures
CREATE POLICY "Allow authenticated users to upload their profile pictures" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'prayer-diary' AND name LIKE 'profiles/%');

-- Allow authenticated users to view any profile pictures (needed for viewing other users' profiles)
CREATE POLICY "Allow authenticated users to view profile pictures" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'prayer-diary' AND name LIKE 'profiles/%');

-- Allow authenticated users to update their own profile pictures
CREATE POLICY "Allow authenticated users to update their profile pictures" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'prayer-diary' AND name LIKE 'profiles/%');

-- Allow authenticated users to delete their own profile pictures
CREATE POLICY "Allow authenticated users to delete their profile pictures" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'prayer-diary' AND name LIKE 'profiles/%');

-- Note: These policies allow all authenticated users to manage any profile picture
-- For stricter security, you can modify these policies to only allow users to manage 
-- their own files by checking the owner of the file. For example:
--
-- CREATE POLICY "Allow users to manage only their own profile pictures" 
-- ON storage.objects FOR DELETE 
-- TO authenticated
-- USING (bucket_id = 'prayer-diary' AND name LIKE 'profiles/%' AND owner = auth.uid());