-- Extend the auth.users table with a profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  full_name TEXT,
  profile_image_url TEXT,
  prayer_points TEXT,
  user_role TEXT NOT NULL DEFAULT 'User',
  approval_state TEXT NOT NULL DEFAULT 'Pending',
  prayer_calendar_editor BOOLEAN NOT NULL DEFAULT FALSE,
  prayer_update_editor BOOLEAN NOT NULL DEFAULT FALSE,
  urgent_prayer_editor BOOLEAN NOT NULL DEFAULT FALSE,
  notification_email BOOLEAN NOT NULL DEFAULT TRUE,
  notification_sms BOOLEAN NOT NULL DEFAULT FALSE,
  notification_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  notification_push BOOLEAN NOT NULL DEFAULT FALSE,
  phone_number TEXT,
  whatsapp_number TEXT,
  CONSTRAINT user_role_check CHECK (user_role IN ('Administrator', 'User')),
  CONSTRAINT approval_state_check CHECK (approval_state IN ('Pending', 'Approved', 'Rejected'))
);

-- Create a table for prayer calendar entries
CREATE TABLE prayer_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  name TEXT NOT NULL,
  image_url TEXT,
  prayer_points TEXT,
  is_user BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE
);

-- Create a table for weekly prayer updates
CREATE TABLE prayer_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE
);

-- Create a table for urgent prayer requests
CREATE TABLE urgent_prayers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create a table for notification logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT
);

-- Set up Row Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgent_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Anyone can read their own profile
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Administrators can read all profiles
CREATE POLICY "Administrators can view all profiles" 
  ON profiles FOR SELECT 
  USING ((SELECT user_role FROM profiles WHERE id = auth.uid()) = 'Administrator');

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Administrators can update all profiles
CREATE POLICY "Administrators can update any profile" 
  ON profiles FOR UPDATE 
  USING ((SELECT user_role FROM profiles WHERE id = auth.uid()) = 'Administrator');

-- Prayer Calendar policies
-- Anyone can read the prayer calendar if they're approved
CREATE POLICY "Approved users can view prayer calendar" 
  ON prayer_calendar FOR SELECT 
  USING ((SELECT approval_state FROM profiles WHERE id = auth.uid()) = 'Approved');

-- Only prayer calendar editors can insert/update/delete
CREATE POLICY "Prayer calendar editors can manage prayer calendar" 
  ON prayer_calendar FOR ALL 
  USING ((SELECT prayer_calendar_editor FROM profiles WHERE id = auth.uid()) = TRUE);

-- Prayer Updates policies
-- Anyone can read prayer updates if they're approved
CREATE POLICY "Approved users can view prayer updates" 
  ON prayer_updates FOR SELECT 
  USING ((SELECT approval_state FROM profiles WHERE id = auth.uid()) = 'Approved');

-- Only prayer update editors can insert/update/delete
CREATE POLICY "Prayer update editors can manage prayer updates" 
  ON prayer_updates FOR ALL 
  USING ((SELECT prayer_update_editor FROM profiles WHERE id = auth.uid()) = TRUE);

-- Urgent Prayers policies
-- Anyone can read urgent prayers if they're approved
CREATE POLICY "Approved users can view urgent prayers" 
  ON urgent_prayers FOR SELECT 
  USING ((SELECT approval_state FROM profiles WHERE id = auth.uid()) = 'Approved');

-- Only urgent prayer editors can insert/update/delete
CREATE POLICY "Urgent prayer editors can manage urgent prayers" 
  ON urgent_prayers FOR ALL 
  USING ((SELECT urgent_prayer_editor FROM profiles WHERE id = auth.uid()) = TRUE);

-- Notification Logs policies
-- Users can view their own notification logs
CREATE POLICY "Users can view their own notification logs" 
  ON notification_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Administrators can view all notification logs
CREATE POLICY "Administrators can view all notification logs" 
  ON notification_logs FOR SELECT 
  USING ((SELECT user_role FROM profiles WHERE id = auth.uid()) = 'Administrator');

-- Create a trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_role, approval_state)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    'User', 
    'Pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();