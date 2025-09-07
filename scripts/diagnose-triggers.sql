-- 🔍 Comprehensive Trigger Diagnosis
-- This script checks if triggers are created, enabled, and working

-- 1. Check if trigger functions exist
SELECT '=== TRIGGER FUNCTIONS ===' as section;
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname IN ('handle_user_blocking', 'handle_user_unblocking')
ORDER BY proname;

-- 2. Check if triggers exist and are enabled
SELECT '=== TRIGGER STATUS ===' as section;
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgenabled,
    CASE
        WHEN tgenabled = 'O' THEN '✅ ENABLED'
        WHEN tgenabled = 'D' THEN '❌ DISABLED'
        WHEN tgenabled = 'R' THEN '🔄 REPLICA'
        WHEN tgenabled = 'A' THEN '⚠️ ALWAYS'
        ELSE '❓ UNKNOWN'
    END as status
FROM pg_trigger
WHERE tgrelid = 'blocked_users'::regclass
ORDER BY tgname;

-- 3. Check current blocking data
SELECT '=== CURRENT DATA STATE ===' as section;
SELECT
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as users_with_blocked_true,
    (SELECT COUNT(*) FROM users WHERE is_blocked = false) as users_with_blocked_false,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as admin_blocks,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = false) as user_blocks;

-- 4. Check for any inconsistencies
SELECT '=== INCONSISTENCIES ===' as section;
SELECT
    bu.id,
    bu.user_id,
    bu.blocked_user_id,
    bu.reason,
    bu.blocked_by_admin,
    u.is_blocked,
    CASE
        WHEN bu.blocked_by_admin = true AND u.is_blocked = true THEN '✅ OK'
        WHEN bu.blocked_by_admin = true AND u.is_blocked = false THEN '❌ TRIGGER FAILED - Should be blocked'
        WHEN bu.blocked_by_admin = false AND u.is_blocked = true THEN '⚠️ User block but is_blocked = true'
        WHEN bu.blocked_by_admin = false AND u.is_blocked = false THEN '✅ OK'
        ELSE '❓ Unknown state'
    END as status
FROM blocked_users bu
JOIN users u ON bu.blocked_user_id = u.id
ORDER BY bu.created_at DESC
LIMIT 5;

-- 5. Test trigger manually (if functions exist)
SELECT '=== MANUAL TRIGGER TEST ===' as section;
DO $$
DECLARE
    test_result TEXT := 'Not tested';
BEGIN
    -- Check if we can call the trigger function
    BEGIN
        -- This will test if the function exists and is callable
        PERFORM handle_user_blocking();
        test_result := '❌ Function exists but should not be called directly';
    EXCEPTION
        WHEN undefined_function THEN
            test_result := '❌ Function does not exist';
        WHEN others THEN
            test_result := '✅ Function exists and is callable';
    END;

    RAISE NOTICE 'Trigger function test: %', test_result;
END $$;

-- 6. Check database permissions
SELECT '=== DATABASE PERMISSIONS ===' as section;
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'blocked_users')
ORDER BY tablename;

-- 7. Check if RLS is interfering
SELECT '=== RLS STATUS ===' as section;
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'blocked_users')
ORDER BY tablename;