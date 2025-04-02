-- Create a function that returns a user's email by ID
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

-- Create a function that returns a user's full name by ID
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
