-- 🚀 READY-TO-RUN: Automatic Blocking Triggers
-- Copy and paste this entire script into your Supabase SQL Editor and run it

-- Function to handle blocking (set is_blocked = true)
CREATE OR REPLACE FUNCTION handle_user_blocking()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process admin blocks
    IF NEW.blocked_by_admin = true THEN
        UPDATE users
        SET is_blocked = true
        WHERE id = NEW.blocked_user_id;

        RAISE NOTICE 'User % has been automatically blocked', NEW.blocked_user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle unblocking (set is_blocked = false)
CREATE OR REPLACE FUNCTION handle_user_unblocking()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process admin blocks
    IF OLD.blocked_by_admin = true THEN
        -- Check if user has any other admin blocks remaining
        IF NOT EXISTS (
            SELECT 1 FROM blocked_users
            WHERE blocked_user_id = OLD.blocked_user_id
            AND blocked_by_admin = true
            AND id != OLD.id
        ) THEN
            UPDATE users
            SET is_blocked = false
            WHERE id = OLD.blocked_user_id;

            RAISE NOTICE 'User % has been automatically unblocked', OLD.blocked_user_id;
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on blocked_users table
DROP TRIGGER IF EXISTS trigger_user_blocking ON blocked_users;
CREATE TRIGGER trigger_user_blocking
    AFTER INSERT ON blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_blocking();

DROP TRIGGER IF EXISTS trigger_user_unblocking ON blocked_users;
CREATE TRIGGER trigger_user_unblocking
    AFTER DELETE ON blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_unblocking();

-- Verify triggers are created
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled
FROM pg_trigger
WHERE tgrelid = 'blocked_users'::regclass
ORDER BY tgname;