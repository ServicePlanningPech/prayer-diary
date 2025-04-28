-- Fix the unique constraint for push_subscriptions using a functional index approach

-- First, drop the existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_subscription_endpoint' 
        AND conrelid = 'push_subscriptions'::regclass
    ) THEN
        ALTER TABLE push_subscriptions DROP CONSTRAINT unique_subscription_endpoint;
    END IF;
END
$$;

-- Create a unique index directly (safer approach)
DROP INDEX IF EXISTS idx_unique_subscription_endpoint;

-- Note: We need the expression WITH quotes but escaped properly
CREATE UNIQUE INDEX idx_unique_subscription_endpoint 
  ON push_subscriptions ((subscription_object->>'endpoint'));

-- Add a comment explaining the index
COMMENT ON INDEX idx_unique_subscription_endpoint 
IS 'Ensures that each subscription endpoint is unique in the database';
