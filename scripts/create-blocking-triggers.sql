-- Create Database Triggers for Automatic is_blocked Updates
-- This script creates triggers that automatically manage the is_blocked column

-- First, ensure the is_blocked column exists in the users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_blocked'
    ) THEN
        ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_blocked column to users table';
    ELSE
        RAISE NOTICE 'is_blocked column already exists in users table';
    END IF;
END $$;

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
SELECT '=== TRIGGERS CREATED ===' as status;
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid = 'blocked_users'::regclass
ORDER BY tgname;

-- Test the triggers with a simple verification
SELECT '=== TRIGGER VERIFICATION ===' as status;
DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get test users
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' OR is_admin = true LIMIT 1;
    SELECT id INTO test_user_id FROM users WHERE id != admin_user_id LIMIT 1;

    IF test_user_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing triggers with admin: %, user: %', admin_user_id, test_user_id;

        -- Insert test block (should trigger is_blocked = true)
        INSERT INTO blocked_users (user_id, blocked_user_id, reason, blocked_by_admin)
        VALUES (admin_user_id, test_user_id, 'Trigger test block', true);

        -- Check if trigger worked
        IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id AND is_blocked = true) THEN
            RAISE NOTICE '✅ Block trigger worked: User is_blocked set to true';
        ELSE
            RAISE NOTICE '❌ Block trigger failed: User is_blocked not updated';
        END IF;

        -- Delete test block (should trigger is_blocked = false)
        DELETE FROM blocked_users
        WHERE user_id = admin_user_id
        AND blocked_user_id = test_user_id
        AND reason = 'Trigger test block';

        -- Check if unblock trigger worked
        IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id AND is_blocked = false) THEN
            RAISE NOTICE '✅ Unblock trigger worked: User is_blocked set to false';
        ELSE
            RAISE NOTICE '❌ Unblock trigger failed: User is_blocked not updated';
        END IF;

    ELSE
        RAISE NOTICE 'Not enough users to test triggers';
    END IF;
END $$;

-- Final status check
SELECT '=== FINAL STATUS ===' as status;
SELECT
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as users_marked_blocked,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as admin_block_records,
    CASE
        WHEN (SELECT COUNT(*) FROM users WHERE is_blocked = true) =
             (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true)
        THEN 'CONSISTENT'
        ELSE 'INCONSISTENT - CHECK TRIGGERS'
    END as trigger_status;

RAISE NOTICE '=== BLOCKING TRIGGERS SETUP COMPLETE ===';
RAISE NOTICE 'Triggers will now automatically manage the is_blocked column';
RAISE NOTICE 'No manual updates needed in application code';