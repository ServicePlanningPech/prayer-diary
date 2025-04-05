-- CAUTION: This grants temporary unrestricted access for testing purposes
-- DO NOT use in production for extended periods

-- First, disable RLS on the storage.objects table to bypass all policies
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you prefer to keep RLS enabled but have a permissive policy:
-- DROP POLICY IF EXISTS "Temporary unrestricted access" ON storage.objects;
-- CREATE POLICY "Temporary unrestricted access" ON storage.objects FOR ALL USING (true);

-- After testing, run this to restore security:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Temporary unrestricted access" ON storage.objects;

-- DIAGNOSTIC: This function helps debug storage policies
-- Call it with: SELECT debug_storage_access('prayer-diary', 'profiles/userid_timestamp.jpg', 'authenticated user id');
CREATE OR REPLACE FUNCTION debug_storage_access(bucket text, object_path text, user_id text)
RETURNS TABLE (
    policy_name text,
    applies_to_operation text,
    result boolean,
    condition text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.policyname,
        p.operation,
        pg_catalog.regexp_replace(p.cmd, '^[^)]*\)\s*', '') AS condition,
        -- Simulate if the policy would pass
        EXISTS (
            WITH vars AS (
                SELECT 
                    bucket AS bucket_id,
                    object_path AS name,
                    user_id AS auth_uid
            )
            SELECT 1
            FROM vars
            WHERE eval_policy_predicate(
                pg_catalog.regexp_replace(p.cmd, '^[^)]*\)\s*', ''),
                '{bucket_id, name}',
                '{vars.bucket_id, vars.name}'
            )
        ) AS result
    FROM pg_policies p
    WHERE p.tablename = 'objects' AND p.schemaname = 'storage'
    ORDER BY p.policyname;

    -- This function relies on internal PostgreSQL functionality and may not work in all environments
    -- If you can't run this function, check policies through Supabase UI instead
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;