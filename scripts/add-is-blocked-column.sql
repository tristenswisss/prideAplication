-- Add is_blocked column to users table for easier querying
-- This creates a computed column that shows if a user is currently blocked

-- First, add the is_blocked column to the users table
ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;

-- Create a function to update the is_blocked status
CREATE OR REPLACE FUNCTION update_user_blocked_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the blocked user's is_blocked status
    IF TG_OP = 'INSERT' AND NEW.blocked_by_admin = true THEN
        UPDATE users SET is_blocked = true WHERE id = NEW.blocked_user_id;
    ELSIF TG_OP = 'DELETE' AND OLD.blocked_by_admin = true THEN
        -- Only unblock if there are no other admin blocks for this user
        IF NOT EXISTS (
            SELECT 1 FROM blocked_users
            WHERE blocked_user_id = OLD.blocked_user_id
            AND blocked_by_admin = true
            AND id != OLD.id
        ) THEN
            UPDATE users SET is_blocked = false WHERE id = OLD.blocked_user_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update the is_blocked column
CREATE TRIGGER update_user_blocked_status_trigger
    AFTER INSERT OR DELETE ON blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_blocked_status();

-- Update existing blocked users to have is_blocked = true
UPDATE users
SET is_blocked = true
WHERE id IN (
    SELECT DISTINCT blocked_user_id
    FROM blocked_users
    WHERE blocked_by_admin = true
);

-- Create an index on the is_blocked column for better performance
CREATE INDEX idx_users_is_blocked ON users(is_blocked);

-- Update RLS policies to include the new column
-- Users can view their own blocked status
CREATE POLICY "Users can view their own blocked status" ON users
    FOR SELECT USING (auth.uid() = id);

-- Test the implementation
SELECT 'Users with blocked status:' as info;
SELECT id, email, name, is_blocked
FROM users
WHERE is_blocked = true
ORDER BY name;

SELECT 'Total blocked users:' as info;
SELECT COUNT(*) as blocked_count FROM users WHERE is_blocked = true;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== IS_BLOCKED COLUMN ADDED SUCCESSFULLY ===';
    RAISE NOTICE '1. Added is_blocked column to users table';
    RAISE NOTICE '2. Created function to automatically update blocked status';
    RAISE NOTICE '3. Created triggers for automatic updates';
    RAISE NOTICE '4. Updated existing blocked users';
    RAISE NOTICE '5. Created index for better performance';
    RAISE NOTICE '6. Now you can easily query: SELECT * FROM users WHERE is_blocked = true';
END $$;