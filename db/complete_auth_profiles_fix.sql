-- Complete script to fix the relationship between auth.users and profiles
-- Run this script in the SQL Editor of your Supabase dashboard

-- Step 1: Create a secure view that exposes only necessary auth user data
CREATE OR REPLACE VIEW public.auth_user_view AS
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name
FROM auth.users;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.auth_user_view TO authenticated;
GRANT SELECT ON public.auth_user_view TO anon;
GRANT SELECT ON public.auth_user_view TO service_role;

-- Step 2: Create a function that returns a user's email by ID
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth_user_view WHERE id = user_id;
$$;

-- Grant appropriate permissions on the function
GRANT EXECUTE ON FUNCTION public.get_user_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email TO service_role;

-- Step 3: Create a function that returns a user's full name by ID
CREATE OR REPLACE FUNCTION public.get_user_full_name(user_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT full_name FROM auth_user_view WHERE id = user_id;
$$;

-- Grant appropriate permissions on the function
GRANT EXECUTE ON FUNCTION public.get_user_full_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_full_name TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_full_name TO service_role;

-- Step 4: Update the user trigger function to correctly set the full name and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_val TEXT;
BEGIN
  -- Get the full name from metadata if available, otherwise use email
  SELECT COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) INTO full_name_val;
  
  INSERT INTO public.profiles (id, full_name, user_role, approval_state, email)
  VALUES (NEW.id, full_name_val, 'User', 'Pending', NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a function that returns all profiles with emails
CREATE OR REPLACE FUNCTION public.get_profiles_with_emails()
RETURNS TABLE (
  id uuid,
  updated_at timestamptz,
  full_name text,
  profile_image_url text,
  prayer_points text,
  user_role text,
  approval_state text,
  prayer_calendar_editor boolean,
  prayer_update_editor boolean,
  urgent_prayer_editor boolean,
  notification_email boolean,
  notification_sms boolean,
  notification_whatsapp boolean,
  notification_push boolean,
  phone_number text,
  whatsapp_number text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.*,
    a.email
  FROM 
    profiles p
  LEFT JOIN 
    auth_user_view a ON p.id = a.id
  ORDER BY 
    p.full_name ASC;
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_profiles_with_emails TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles_with_emails TO service_role;

-- Step 6: Update existing profiles with correct full names (if needed)
-- This will update any profiles where full_name is null or empty
UPDATE profiles p
SET full_name = a.full_name
FROM auth_user_view a
WHERE p.id = a.id AND (p.full_name IS NULL OR p.full_name = '');
