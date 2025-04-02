-- Create a secure view that exposes only necessary auth user data
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
