-- Create the push_subscriptions table to store Web Push subscription information

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_object JSONB NOT NULL,
  user_agent TEXT,
  active BOOLEAN DEFAULT TRUE
);

-- Setup RLS policies for the push_subscriptions table

-- Enable RLS on the table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own subscriptions
CREATE POLICY "Users can add their own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscriptions
CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create unique index on the endpoint within the JSONB
CREATE UNIQUE INDEX idx_unique_subscription_endpoint ON push_subscriptions ((subscription_object->>'endpoint'));

-- Create index on user_id for faster lookups
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Create index on active flag
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(active);

-- Comment on table and columns for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores web push notification subscription information for users';
COMMENT ON COLUMN push_subscriptions.id IS 'Unique identifier for the subscription';
COMMENT ON COLUMN push_subscriptions.user_id IS 'The user this subscription belongs to';
COMMENT ON COLUMN push_subscriptions.subscription_object IS 'The PushSubscription object from the browser';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'The user agent of the browser that created the subscription';
COMMENT ON COLUMN push_subscriptions.active IS 'Whether this subscription is still active';
