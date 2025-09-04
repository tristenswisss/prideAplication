-- Debug User Blocking System
-- Run this to check the current state of blocking functionality

-- Check if blocked_users table exists and has data
SELECT 'blocked_users table info:' as info;
SELECT COUNT(*) as total_blocked_users FROM blocked_users;
SELECT * FROM blocked_users LIMIT 5;

-- Check if user_reports table has blocked status
SELECT 'user_reports with blocked status:' as info;
SELECT COUNT(*) as total_blocked_reports FROM user_reports WHERE status = 'blocked';
SELECT id, reporter_id, reported_user_id, reason, status, admin_notes, created_at
FROM user_reports
WHERE status = 'blocked'
ORDER BY created_at DESC
LIMIT 5;

-- Check RLS policies on blocked_users table
SELECT 'RLS policies on blocked_users:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'blocked_users';

-- Check RLS policies on user_reports table
SELECT 'RLS policies on user_reports:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_reports';

-- Check if admin user exists and has proper role
SELECT 'Admin users check:' as info;
SELECT id, email, name, role, is_admin
FROM users
WHERE role = 'admin' OR is_admin = true
LIMIT 5;

-- Test a specific user's blocking status (replace 'user-id-here' with actual user ID)
-- SELECT 'Check specific user blocking:' as info;
-- SELECT bu.*, u.name as blocker_name, bu2.name as blocked_name
-- FROM blocked_users bu
-- LEFT JOIN users u ON bu.user_id = u.id
-- LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
-- WHERE bu.blocked_user_id = 'user-id-here' AND bu.blocked_by_admin = true;

-- Check recent blocking activity
SELECT 'Recent blocking activity:' as info;
SELECT bu.created_at, u.name as admin_name, bu2.name as blocked_name, bu.reason
FROM blocked_users bu
LEFT JOIN users u ON bu.user_id = u.id
LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
WHERE bu.blocked_by_admin = true
ORDER BY bu.created_at DESC
LIMIT 10;

-- Check for any constraint violations or errors
SELECT 'Check for constraint issues:' as info;
SELECT conname, conrelid::regclass, contype, condeferrable, condeferred, convalidated
FROM pg_constraint
WHERE conrelid = 'blocked_users'::regclass OR conrelid = 'user_reports'::regclass;