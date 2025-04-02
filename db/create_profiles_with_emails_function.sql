-- Create a function that returns all profiles with emails
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
