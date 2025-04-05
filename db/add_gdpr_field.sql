-- Add GDPR acceptance field to profiles table
-- Run this SQL if upgrading an existing Prayer Diary installation

-- Add the gdpr_accepted column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS "gdpr_accepted" BOOLEAN NOT NULL DEFAULT FALSE;

-- Administrators are automatically set to gdpr_accepted = TRUE
UPDATE profiles 
SET gdpr_accepted = TRUE 
WHERE user_role = 'Administrator';

-- Apply the same behavior to the trigger that creates new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    user_role, 
    approval_state, 
    profile_set,
    prayer_update_notification_method,
    urgent_prayer_notification_method,
    gdpr_accepted
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    'User', 
    'Pending',
    FALSE,
    'email',
    'email',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;