-- 🧪 Manual Block Test
-- Test blocking a user manually to see if triggers work

-- First, find an admin and a regular user
SELECT '=== AVAILABLE USERS ===' as section;
SELECT id, email, name, role, is_admin, is_blocked
FROM users
WHERE role = 'admin' OR is_admin = true
   OR id NOT IN (SELECT user_id FROM admin_users)
ORDER BY created_at DESC
LIMIT 5;

-- Pick specific users for testing (replace with actual IDs)
-- Example: Let's say admin is 'uuid-admin' and user is 'uuid-user'

DO $$
DECLARE
    admin_id UUID := 'replace-with-admin-uuid';  -- Replace with actual admin UUID
    user_id UUID := 'replace-with-user-uuid';    -- Replace with actual user UUID
BEGIN
    -- Check current state
    RAISE NOTICE '=== BEFORE BLOCK ===';
    RAISE NOTICE 'User is_blocked status: %', (SELECT is_blocked FROM users WHERE id = user_id);
    RAISE NOTICE 'Existing blocks: %', (SELECT COUNT(*) FROM blocked_users WHERE blocked_user_id = user_id);

    -- Insert block record
    RAISE NOTICE '=== INSERTING BLOCK RECORD ===';
    INSERT INTO blocked_users (user_id, blocked_user_id, reason, blocked_by_admin)
    VALUES (admin_id, user_id, 'Manual trigger test', true);

    -- Check if trigger worked
    RAISE NOTICE '=== AFTER BLOCK ===';
    RAISE NOTICE 'User is_blocked status: %', (SELECT is_blocked FROM users WHERE id = user_id);
    RAISE NOTICE 'Block records: %', (SELECT COUNT(*) FROM blocked_users WHERE blocked_user_id = user_id);

    -- Clean up test data
    RAISE NOTICE '=== CLEANING UP ===';
    DELETE FROM blocked_users
    WHERE user_id = admin_id
    AND blocked_user_id = user_id
    AND reason = 'Manual trigger test';

    RAISE NOTICE 'Final is_blocked status: %', (SELECT is_blocked FROM users WHERE id = user_id);
END $$;