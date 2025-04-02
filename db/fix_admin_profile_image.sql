-- This script sets the profile_image_url to NULL for the super admin user
-- This will force the app to use the placeholder image

UPDATE profiles
SET profile_image_url = NULL
WHERE user_role = 'Administrator' AND full_name = 'Super Admin';

-- Verify the change was made
SELECT id, full_name, user_role, profile_image_url 
FROM profiles 
WHERE user_role = 'Administrator';
