-- 🧪 Test Blocking Triggers
-- Run this after applying the triggers to verify they work

-- Test 1: Check current state
SELECT '=== BEFORE TEST ===' as status;
SELECT
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as blocked_users,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as admin_blocks;

-- Test 2: Get test users and clean up existing test data
DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get test users
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' OR is_admin = true LIMIT 1;
    SELECT id INTO test_user_id FROM users WHERE id != admin_user_id LIMIT 1;

    IF test_user_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with admin: %, user: %', admin_user_id, test_user_id;

        -- Clean up ALL existing records between these users (more comprehensive)
        DELETE FROM blocked_users
        WHERE (user_id = admin_user_id AND blocked_user_id = test_user_id)
           OR (user_id = test_user_id AND blocked_user_id = admin_user_id);

        -- Reset user blocked status for clean test
        UPDATE users SET is_blocked = false WHERE id = test_user_id;

        -- Verify cleanup worked
        IF EXISTS (
            SELECT 1 FROM blocked_users
            WHERE (user_id = admin_user_id AND blocked_user_id = test_user_id)
               OR (user_id = test_user_id AND blocked_user_id = admin_user_id)
        ) THEN
            RAISE NOTICE '❌ Cleanup failed - existing records still present';
            RETURN;
        END IF;

        RAISE NOTICE '✅ Cleanup successful - proceeding with test';

        -- Test blocking trigger
        RAISE NOTICE '=== TESTING BLOCK TRIGGER ===';
        INSERT INTO blocked_users (user_id, blocked_user_id, reason, blocked_by_admin)
        VALUES (admin_user_id, test_user_id, 'Trigger test - block', true);

        -- Check if user is blocked
        IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id AND is_blocked = true) THEN
            RAISE NOTICE '✅ BLOCK TRIGGER SUCCESS: User is_blocked = true';
        ELSE
            RAISE NOTICE '❌ BLOCK TRIGGER FAILED: User is_blocked not updated';
        END IF;

        -- Test unblocking trigger
        RAISE NOTICE '=== TESTING UNBLOCK TRIGGER ===';
        DELETE FROM blocked_users
        WHERE user_id = admin_user_id
        AND blocked_user_id = test_user_id
        AND reason = 'Trigger test - block';

        -- Check if user is unblocked
        IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id AND is_blocked = false) THEN
            RAISE NOTICE '✅ UNBLOCK TRIGGER SUCCESS: User is_blocked = false';
        ELSE
            RAISE NOTICE '❌ UNBLOCK TRIGGER FAILED: User is_blocked not updated';
        END IF;

    ELSE
        RAISE NOTICE '❌ Not enough users to test triggers';
    END IF;
END $$;

-- Test 3: Check final state
SELECT '=== AFTER TEST ===' as status;
SELECT
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as blocked_users,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as admin_blocks,
    CASE
        WHEN (SELECT COUNT(*) FROM users WHERE is_blocked = true) =
             (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true)
        THEN '✅ CONSISTENT'
        ELSE '❌ INCONSISTENT'
    END as trigger_status;