-- Add the active column to push_subscriptions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions' AND column_name = 'active'
    ) THEN
        ALTER TABLE push_subscriptions ADD COLUMN active BOOLEAN DEFAULT TRUE;
        
        -- Create index on active flag
        CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);
        
        -- Add comment for documentation
        COMMENT ON COLUMN push_subscriptions.active IS 'Whether this subscription is still active';
    END IF;
END
$$;