-- Script to fix the foreign key relationship between profiles and auth.users tables

-- First, add the correct foreign key constraint explicitly if it doesn't exist already
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    -- The constraint doesn't exist, so add it
    EXECUTE 'ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;';
  END IF;
END $$;

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Make sure profiles are accessible to authenticated users
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Add explicit policy for accessing user emails via the auth table
DROP POLICY IF EXISTS "Administrators can read user emails" ON auth.users;
CREATE POLICY "Administrators can read user emails"
  ON auth.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'Administrator'
    )
  );

-- Refresh the schema cache to ensure relationships are recognized
NOTIFY pgrst, 'reload schema';
