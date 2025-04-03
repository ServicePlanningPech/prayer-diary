-- Update notification settings in profiles table
-- Migrates from individual boolean flags to two separate notification method fields

-- Add new notification method columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS prayer_update_notification_method TEXT NOT NULL DEFAULT 'email',
ADD COLUMN IF NOT EXISTS urgent_prayer_notification_method TEXT NOT NULL DEFAULT 'email';

-- Migrate existing users based on their current notification preferences
-- If email is enabled, set to 'email'
-- If SMS is enabled, set to 'sms'
-- If WhatsApp is enabled, set to 'whatsapp'
-- Otherwise, default to 'none' (app only)

-- Update prayer_update_notification_method
UPDATE profiles SET prayer_update_notification_method = 
    CASE 
        WHEN notification_email = TRUE THEN 'email'
        WHEN notification_sms = TRUE THEN 'sms'
        WHEN notification_whatsapp = TRUE THEN 'whatsapp'
        ELSE 'none'
    END;

-- Update urgent_prayer_notification_method
UPDATE profiles SET urgent_prayer_notification_method = 
    CASE 
        WHEN notification_email = TRUE THEN 'email'
        WHEN notification_sms = TRUE THEN 'sms'
        WHEN notification_whatsapp = TRUE THEN 'whatsapp'
        ELSE 'none'
    END;

-- Keep notification_push for future use but remove the redundant notification columns
-- We keep notification_push for potential future use
ALTER TABLE profiles DROP COLUMN notification_email;
ALTER TABLE profiles DROP COLUMN notification_sms;
ALTER TABLE profiles DROP COLUMN notification_whatsapp;

-- Add constraint to ensure only valid notification methods are used
ALTER TABLE profiles
ADD CONSTRAINT valid_prayer_update_notification_method
CHECK (prayer_update_notification_method IN ('none', 'email', 'sms', 'whatsapp'));

ALTER TABLE profiles
ADD CONSTRAINT valid_urgent_prayer_notification_method
CHECK (urgent_prayer_notification_method IN ('none', 'email', 'sms', 'whatsapp'));
