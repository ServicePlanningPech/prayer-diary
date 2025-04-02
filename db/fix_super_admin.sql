-- This script fixes the super admin record to display the correct email
-- Run this after implementing the auth-profiles relationship fixes

-- Step 1: Verify the auth view exists (create it if not)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_views WHERE viewname = 'auth_user_view') THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.auth_user_view AS
    SELECT 
      id,
      email,
      COALESCE(raw_user_meta_data->>''full_name'', email) as full_name
    FROM auth.users';
    
    EXECUTE 'GRANT SELECT ON public.auth_user_view TO authenticated';
    EXECUTE 'GRANT SELECT ON public.auth_user_view TO anon';
    EXECUTE 'GRANT SELECT ON public.auth_user_view TO service_role';
  END IF;
END
$$;

-- Step 2: Get the super admin user ID and email from auth.users
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT;
BEGIN
  -- Find the super admin user in auth.users
  SELECT id, email INTO admin_id, admin_email
  FROM auth.users
  WHERE email = 'prayerdiary@pech.co.uk'
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Super admin user not found with email prayerdiary@pech.co.uk';
    RETURN;
  END IF;
  
  -- Update the super admin profile with the correct email (for reference)
  UPDATE profiles
  SET full_name = 'Super Admin',
      user_role = 'Administrator',
      approval_state = 'Approved',
      prayer_calendar_editor = true,
      prayer_update_editor = true,
      urgent_prayer_editor = true
  WHERE id = admin_id;
  
  RAISE NOTICE 'Updated super admin profile with ID % and email %', admin_id, admin_email;
END
$$;

-- Step 3: Create functions for accessing user email and full name
DO $$
BEGIN
  -- Create get_user_email function
  EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
  RETURNS TEXT
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  AS $func$
    SELECT email FROM auth_user_view WHERE id = user_id;
  $func$';
  
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_email TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_email TO anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_email TO service_role';
END
$$;

-- Step 4: Test if we can get the super admin email
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT;
BEGIN
  -- Find the super admin user
  SELECT id INTO admin_id
  FROM profiles
  WHERE user_role = 'Administrator'
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Super admin user not found in profiles table';
    RETURN;
  END IF;
  
  -- Get email using our function
  EXECUTE 'SELECT get_user_email($1)' INTO admin_email USING admin_id;
  
  RAISE NOTICE 'Super admin email: %', admin_email;
END
$$;

-- Step 5: Update the JavaScript to use the new function
-- Update admin.js as described in previous instructions
