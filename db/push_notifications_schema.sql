-- Schema for Push Notifications

-- Table for storing Web Push API subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);

-- Table for storing Firebase Cloud Messaging device tokens
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT, -- 'android', 'ios', 'web', etc.
  device_name TEXT, -- Optional device name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens (user_id);

-- Row-level security policies for push_subscriptions table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own push subscriptions
CREATE POLICY push_subscriptions_select_policy ON push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own push subscriptions
CREATE POLICY push_subscriptions_insert_policy ON push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own push subscriptions
CREATE POLICY push_subscriptions_update_policy ON push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own push subscriptions
CREATE POLICY push_subscriptions_delete_policy ON push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Row-level security policies for device_tokens table
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own device tokens
CREATE POLICY device_tokens_select_policy ON device_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own device tokens
CREATE POLICY device_tokens_insert_policy ON device_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own device tokens
CREATE POLICY device_tokens_update_policy ON device_tokens
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own device tokens
CREATE POLICY device_tokens_delete_policy ON device_tokens
FOR DELETE
USING (auth.uid() = user_id);
