-- Add profile_set field to profiles table
-- Run this SQL if upgrading an existing Prayer Diary installation

-- Add the profile_set column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_set BOOLEAN NOT NULL DEFAULT FALSE;

-- Set profile_set to TRUE for users who have already updated their profiles
UPDATE profiles 
SET profile_set = TRUE 
WHERE updated_at IS NOT NULL;

-- Make sure all administrators have profile_set = TRUE
UPDATE profiles 
SET profile_set = TRUE 
WHERE user_role = 'Administrator';

-- Apply the same behavior to the trigger that creates new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_role, approval_state, profile_set)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    'User', 
    'Pending',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;