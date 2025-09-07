-- 🔍 Simple Trigger Test - Check Existing Data
-- This test doesn't create new data, just verifies triggers work with existing records

-- Check current state
SELECT '=== CURRENT BLOCKING STATE ===' as status;
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_blocked = true THEN 1 END) as blocked_users,
    COUNT(CASE WHEN is_blocked = false THEN 1 END) as unblocked_users
FROM users;

SELECT
    COUNT(*) as total_blocks,
    COUNT(CASE WHEN blocked_by_admin = true THEN 1 END) as admin_blocks,
    COUNT(CASE WHEN blocked_by_admin = false THEN 1 END) as user_blocks
FROM blocked_users;

-- Check consistency between blocked_users and is_blocked
SELECT '=== CONSISTENCY CHECK ===' as status;
WITH block_stats AS (
    SELECT
        COUNT(*) as admin_blocks_in_table
    FROM blocked_users
    WHERE blocked_by_admin = true
),
user_stats AS (
    SELECT
        COUNT(*) as users_marked_blocked
    FROM users
    WHERE is_blocked = true
)
SELECT
    bs.admin_blocks_in_table,
    us.users_marked_blocked,
    CASE
        WHEN bs.admin_blocks_in_table = us.users_marked_blocked THEN '✅ CONSISTENT - Triggers working!'
        WHEN bs.admin_blocks_in_table > us.users_marked_blocked THEN '❌ INCONSISTENT - Missing blocked status'
        WHEN bs.admin_blocks_in_table < us.users_marked_blocked THEN '❌ INCONSISTENT - Extra blocked status'
        ELSE '❌ INCONSISTENT - Unknown issue'
    END as trigger_status
FROM block_stats bs, user_stats us;

-- Show any inconsistencies
SELECT '=== INCONSISTENT RECORDS ===' as status;
SELECT
    bu.id,
    bu.user_id,
    bu.blocked_user_id,
    bu.reason,
    bu.blocked_by_admin,
    u.is_blocked,
    CASE
        WHEN bu.blocked_by_admin = true AND u.is_blocked = true THEN '✅ OK'
        WHEN bu.blocked_by_admin = true AND u.is_blocked = false THEN '❌ Missing is_blocked = true'
        WHEN bu.blocked_by_admin = false AND u.is_blocked = true THEN '⚠️ User block but is_blocked = true'
        ELSE '✅ OK'
    END as status
FROM blocked_users bu
JOIN users u ON bu.blocked_user_id = u.id
ORDER BY bu.created_at DESC
LIMIT 10;

-- Check if triggers exist
SELECT '=== TRIGGER STATUS ===' as status;
SELECT
    tgname as trigger_name,
    tgenabled,
    CASE
        WHEN tgenabled = 'O' THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_trigger
WHERE tgrelid = 'blocked_users'::regclass
ORDER BY tgname;