-- Fix Storage Bucket Policies for Profile Images

-- This SQL script sets up the necessary storage bucket policies to allow:
-- 1. Users to upload their own profile images
-- 2. Anyone (including administrators) to view profile images

-- First, remove any existing restrictive policies
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can access all objects" ON storage.objects;

-- Allow users to upload their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'prayer-diary' AND
  name LIKE 'profiles/%' AND
  name LIKE 'profiles/' || auth.uid() || '_%'
);

-- Allow users to update their own profile images
CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'prayer-diary' AND
  name LIKE 'profiles/%' AND
  name LIKE 'profiles/' || auth.uid() || '_%'
);

-- Allow anyone to view profile images (important for admin panel)
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'prayer-diary' AND
  name LIKE 'profiles/%'
);

-- Give admin users full access to all prayer-diary bucket objects
CREATE POLICY "Admin users can access all objects" 
ON storage.objects
FOR ALL USING (
  bucket_id = 'prayer-diary' AND
  (
    -- Check if the user is an administrator
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_role = 'Administrator'
    )
  )
);

-- You need to run this SQL in your Supabase SQL Editor to apply these policies