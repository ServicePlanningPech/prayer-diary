-- Update the user trigger function to correctly set the full name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_val TEXT;
BEGIN
  -- Get the full name from metadata if available, otherwise use email
  SELECT COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) INTO full_name_val;
  
  INSERT INTO public.profiles (id, full_name, user_role, approval_state)
  VALUES (NEW.id, full_name_val, 'User', 'Pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
