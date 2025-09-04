-- Debug Login Blocking Issues
-- This script helps identify why blocked users can still log in

-- Check current blocked users
SELECT '=== CURRENT BLOCKED USERS ===' as section;
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
WHERE bu.blocked_by_admin = true
ORDER BY bu.created_at DESC;

-- Check user_reports with blocked status
SELECT '=== USER REPORTS WITH BLOCKED STATUS ===' as section;
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
  ur.created_at,
  ur.updated_at
FROM user_reports ur
LEFT JOIN users u1 ON ur.reporter_id = u1.id
LEFT JOIN users u2 ON ur.reported_user_id = u2.id
WHERE ur.status = 'blocked'
ORDER BY ur.created_at DESC;

-- Check for mismatches between blocked_users and user_reports
SELECT '=== MISMATCHES BETWEEN BLOCKED_USERS AND USER_REPORTS ===' as section;
SELECT 'Users in blocked_users but not in blocked reports:' as info;
SELECT
  bu.blocked_user_id,
  u.name,
  u.email,
  bu.reason,
  bu.created_at
FROM blocked_users bu
LEFT JOIN users u ON bu.blocked_user_id = u.id
WHERE bu.blocked_by_admin = true
AND NOT EXISTS (
  SELECT 1 FROM user_reports ur
  WHERE ur.reported_user_id = bu.blocked_user_id
  AND ur.status = 'blocked'
);

SELECT 'Users in blocked reports but not in blocked_users:' as info;
SELECT
  ur.reported_user_id,
  u.name,
  u.email,
  ur.reason,
  ur.created_at
FROM user_reports ur
LEFT JOIN users u ON ur.reported_user_id = u.id
WHERE ur.status = 'blocked'
AND NOT EXISTS (
  SELECT 1 FROM blocked_users bu
  WHERE bu.blocked_user_id = ur.reported_user_id
  AND bu.blocked_by_admin = true
);

-- Test the blocking check query manually
-- Replace 'user-id-here' with an actual blocked user ID to test
SELECT '=== TEST BLOCKING CHECK QUERY ===' as section;
-- SELECT * FROM blocked_users WHERE blocked_user_id = 'user-id-here' AND blocked_by_admin = true;

-- Check RLS policies that might affect the query
SELECT '=== RLS POLICIES CHECK ===' as section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('blocked_users', 'user_reports')
ORDER BY tablename, policyname;

-- Check if there are any users that should be blocked but aren't
SELECT '=== USERS THAT SHOULD BE BLOCKED ===' as section;
SELECT DISTINCT
  ur.reported_user_id,
  u.name,
  u.email,
  COUNT(*) as report_count,
  MAX(ur.created_at) as latest_report
FROM user_reports ur
LEFT JOIN users u ON ur.reported_user_id = u.id
WHERE ur.status = 'blocked'
GROUP BY ur.reported_user_id, u.name, u.email
ORDER BY latest_report DESC;

-- Summary statistics
SELECT '=== SUMMARY STATISTICS ===' as section;
SELECT
  (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as total_blocked_users,
  (SELECT COUNT(*) FROM user_reports WHERE status = 'blocked') as total_blocked_reports,
  (SELECT COUNT(*) FROM users) as total_users;

-- Check for any recent blocking activity
SELECT '=== RECENT BLOCKING ACTIVITY (Last 7 days) ===' as section;
SELECT
  bu.created_at,
  u.name as admin_name,
  bu2.name as blocked_user_name,
  bu2.email as blocked_user_email,
  bu.reason
FROM blocked_users bu
LEFT JOIN users u ON bu.user_id = u.id
LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
WHERE bu.blocked_by_admin = true
AND bu.created_at >= NOW() - INTERVAL '7 days'
ORDER BY bu.created_at DESC;

-- Instructions for manual testing
SELECT '=== MANUAL TESTING INSTRUCTIONS ===' as section;
SELECT '
To test if a specific user is blocked:
1. Replace "user-id-here" in the commented query above with an actual user ID
2. Run the query to see if it returns any results
3. If it returns results, the user should be blocked during login
4. If it returns no results, the user is not blocked in the database

To test the blocking check function:
1. Use the adminService.checkIfUserIsBlocked(userId) function in your app
2. Check the browser console for any errors
3. Verify the function returns { isBlocked: true } for blocked users
' as instructions;