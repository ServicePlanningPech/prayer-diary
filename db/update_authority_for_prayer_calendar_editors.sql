-- SQL script with a simplified approach that grants prayer calendar editors full access
-- to other users' profile records

-- First, drop any existing policies
DROP POLICY IF EXISTS "Prayer calendar editors can update prayer days" ON profiles;
DROP POLICY IF EXISTS "Prayer calendar editors can update prayer days and months" ON profiles;
DROP POLICY IF EXISTS "Prayer calendar editors can update other profiles" ON profiles;

-- Create a policy that gives prayer calendar editors full access to all profiles
CREATE POLICY "Prayer calendar editors can access all profiles"
ON profiles
FOR ALL -- This includes SELECT, INSERT, UPDATE, DELETE
USING (
  -- Either it's your own profile (covered by existing policy)
  -- OR you're a prayer calendar editor
  auth.uid() = id OR
  (
    SELECT prayer_calendar_editor 
    FROM profiles 
    WHERE id = auth.uid()
  ) = TRUE
);