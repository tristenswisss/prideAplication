-- Test the blocking check queries manually
-- This helps verify if the queries in checkIfUserIsBlocked are working

-- Test user ID from the logs
SELECT '=== TESTING WITH USER ID: a28d1c6e-3154-4f25-91ca-e47b31389a13 ===' as test;

-- 1. Check if is_blocked column exists
SELECT '1. Does is_blocked column exist?' as step;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_blocked';

-- 2. Test the exact query used in checkIfUserIsBlocked
SELECT '2. Testing is_blocked column query:' as step;
SELECT id, email, name, is_blocked
FROM users
WHERE id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13';

-- 3. Test blocked_users table query
SELECT '3. Testing blocked_users table query:' as step;
SELECT
  bu.id,
  bu.user_id,
  bu.blocked_user_id,
  bu.reason,
  bu.blocked_by_admin,
  bu.created_at
FROM blocked_users bu
WHERE bu.blocked_user_id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13'
  AND bu.blocked_by_admin = true;

-- 4. Test user_reports query
SELECT '4. Testing user_reports query:' as step;
SELECT
  ur.id,
  ur.reporter_id,
  ur.reported_user_id,
  ur.reason,
  ur.status,
  ur.admin_notes
FROM user_reports ur
WHERE ur.reported_user_id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13'
  AND ur.status = 'blocked'
ORDER BY ur.created_at DESC
LIMIT 1;

-- 5. Manual blocking check logic
SELECT '5. Manual blocking check result:' as step;
WITH user_check AS (
  SELECT is_blocked FROM users WHERE id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13'
),
blocked_check AS (
  SELECT reason FROM blocked_users
  WHERE blocked_user_id = 'a28d1c6e-3154-4f25-91ca-e47b31389a13'
    AND blocked_by_admin = true
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  CASE
    WHEN uc.is_blocked = true THEN 'BLOCKED: is_blocked column is true'
    WHEN bc.reason IS NOT NULL THEN 'BLOCKED: found in blocked_users table'
    ELSE 'NOT BLOCKED: no blocking records found'
  END as blocking_status,
  uc.is_blocked,
  bc.reason
FROM user_check uc
LEFT JOIN blocked_check bc ON true;

-- 6. Check RLS policies that might affect queries
SELECT '6. RLS policies on users table:' as step;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 7. Check RLS policies on blocked_users table
SELECT '7. RLS policies on blocked_users table:' as step;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'blocked_users'
ORDER BY policyname;