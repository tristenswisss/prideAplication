-- Check if is_blocked column exists and verify blocking status
-- This script helps debug why the blocking check isn't working

-- Check if the is_blocked column exists
SELECT '=== CHECKING IS_BLOCKED COLUMN ===' as section;
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'is_blocked';

-- Check the specific user's blocking status
SELECT '=== CHECKING USER BLOCKING STATUS ===' as section;
SELECT
  id,
  email,
  name,
  is_blocked,
  created_at
FROM users
WHERE email = 'craigtogs@gmail.com';

-- Check if user exists in blocked_users table
SELECT '=== CHECKING BLOCKED_USERS TABLE ===' as section;
SELECT
  bu.id,
  bu.user_id as admin_id,
  u.name as admin_name,
  bu.blocked_user_id,
  bu2.name as blocked_user_name,
  bu2.email as blocked_user_email,
  bu.reason,
  bu.blocked_by_admin,
  bu.created_at
FROM blocked_users bu
LEFT JOIN users u ON bu.user_id = u.id
LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
WHERE bu2.email = 'craigtogs@gmail.com' AND bu.blocked_by_admin = true;

-- Check user_reports for this user
SELECT '=== CHECKING USER REPORTS ===' as section;
SELECT
  ur.id,
  ur.reporter_id,
  u1.name as reporter_name,
  ur.reported_user_id,
  u2.name as reported_user_name,
  u2.email as reported_user_email,
  ur.reason,
  ur.status,
  ur.admin_notes,
  ur.created_at
FROM user_reports ur
LEFT JOIN users u1 ON ur.reporter_id = u1.id
LEFT JOIN users u2 ON ur.reported_user_id = u2.id
WHERE u2.email = 'craigtogs@gmail.com' AND ur.status = 'blocked';

-- Test the exact query used in the checkIfUserIsBlocked function
SELECT '=== TESTING IS_BLOCKED COLUMN QUERY ===' as section;
SELECT is_blocked FROM users WHERE id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13';

-- Test the blocked_users table query
SELECT '=== TESTING BLOCKED_USERS TABLE QUERY ===' as section;
SELECT reason FROM blocked_users WHERE blocked_user_id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13' AND blocked_by_admin = true;

-- Summary
SELECT '=== SUMMARY ===' as section;
SELECT
  (SELECT COUNT(*) FROM users WHERE is_blocked = true) as users_with_is_blocked_true,
  (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as users_in_blocked_table,
  (SELECT COUNT(*) FROM user_reports WHERE status = 'blocked') as reports_with_blocked_status;