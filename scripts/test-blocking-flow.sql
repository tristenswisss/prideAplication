-- Test Blocking/Unblocking Flow
-- This script tests the complete blocking and unblocking workflow

-- First, let's see the current state
SELECT '=== CURRENT STATE ===' as section;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as blocked_users FROM users WHERE is_blocked = true;
SELECT COUNT(*) as blocked_records FROM blocked_users WHERE blocked_by_admin = true;

-- Get a test user (replace with actual user ID for testing)
-- SELECT '=== TEST USER INFO ===' as section;
-- SELECT id, email, name, is_blocked FROM users WHERE email = 'test@example.com';

-- Test 1: Check if a user is blocked
-- SELECT '=== CHECKING IF USER IS BLOCKED ===' as section;
-- SELECT bu.*, u.name as blocker_name, bu2.name as blocked_name
-- FROM blocked_users bu
-- LEFT JOIN users u ON bu.user_id = u.id
-- LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
-- WHERE bu.blocked_user_id = 'USER_ID_HERE' AND bu.blocked_by_admin = true;

-- Test 2: Verify is_blocked column matches blocked_users table
SELECT '=== VERIFICATION: is_blocked vs blocked_users ===' as section;
SELECT
    u.id,
    u.email,
    u.is_blocked,
    CASE
        WHEN u.is_blocked = true AND NOT EXISTS (
            SELECT 1 FROM blocked_users bu
            WHERE bu.blocked_user_id = u.id AND bu.blocked_by_admin = true
        ) THEN 'INCONSISTENT: blocked but no record'
        WHEN u.is_blocked = false AND EXISTS (
            SELECT 1 FROM blocked_users bu
            WHERE bu.blocked_user_id = u.id AND bu.blocked_by_admin = true
        ) THEN 'INCONSISTENT: not blocked but has record'
        ELSE 'CONSISTENT'
    END as status
FROM users u
WHERE u.is_blocked = true OR EXISTS (
    SELECT 1 FROM blocked_users bu
    WHERE bu.blocked_user_id = u.id AND bu.blocked_by_admin = true
);

-- Test 3: Check unblock requests
SELECT '=== UNBLOCK REQUESTS ===' as section;
SELECT COUNT(*) as total_requests FROM unblock_requests;
SELECT COUNT(*) as pending_requests FROM unblock_requests WHERE status = 'pending';
SELECT COUNT(*) as approved_requests FROM unblock_requests WHERE status = 'approved';

-- Test 4: Recent blocking activity
SELECT '=== RECENT BLOCKING ACTIVITY ===' as section;
SELECT
    bu.created_at,
    u.name as admin_name,
    bu2.name as blocked_name,
    bu.reason,
    bu2.is_blocked
FROM blocked_users bu
LEFT JOIN users u ON bu.user_id = u.id
LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
WHERE bu.blocked_by_admin = true
ORDER BY bu.created_at DESC
LIMIT 10;

-- Test 5: Check for any orphaned blocks (blocked_users without corresponding users)
SELECT '=== ORPHANED BLOCKS CHECK ===' as section;
SELECT
    bu.*,
    CASE WHEN u.id IS NULL THEN 'ORPHANED' ELSE 'VALID' END as status
FROM blocked_users bu
LEFT JOIN users u ON bu.blocked_user_id = u.id
WHERE bu.blocked_by_admin = true;

-- Summary
SELECT '=== SUMMARY ===' as section;
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as blocked_via_column,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as blocked_via_table,
    (SELECT COUNT(*) FROM unblock_requests WHERE status = 'pending') as pending_unblock_requests;

-- Check for consistency issues
SELECT '=== CONSISTENCY CHECK ===' as section;
WITH block_summary AS (
    SELECT
        COUNT(*) as blocked_in_table
    FROM blocked_users
    WHERE blocked_by_admin = true
),
column_summary AS (
    SELECT
        COUNT(*) as blocked_in_column
    FROM users
    WHERE is_blocked = true
)
SELECT
    bs.blocked_in_table,
    cs.blocked_in_column,
    CASE
        WHEN bs.blocked_in_table = cs.blocked_in_column THEN 'CONSISTENT'
        ELSE 'INCONSISTENT - MISMATCH BETWEEN TABLE AND COLUMN'
    END as consistency_status
FROM block_summary bs, column_summary cs;