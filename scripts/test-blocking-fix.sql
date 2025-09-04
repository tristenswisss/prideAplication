-- Test and Fix Blocking System
-- This script tests the blocking functionality and fixes any issues

-- First, let's check if we have admin users
SELECT 'Checking for admin users:' as status;
SELECT id, email, name, role, is_admin
FROM users
WHERE role = 'admin' OR is_admin = true;

-- Check if there are any blocked users
SELECT 'Checking blocked users:' as status;
SELECT
  bu.id,
  bu.user_id as admin_id,
  u.name as admin_name,
  bu.blocked_user_id,
  bu2.name as blocked_user_name,
  bu.reason,
  bu.blocked_by_admin,
  bu.created_at
FROM blocked_users bu
LEFT JOIN users u ON bu.user_id = u.id
LEFT JOIN users bu2 ON bu.blocked_user_id = bu2.id
ORDER BY bu.created_at DESC;

-- Check if there are any reports with blocked status
SELECT 'Checking blocked reports:' as status;
SELECT
  ur.id,
  ur.reporter_id,
  u1.name as reporter_name,
  ur.reported_user_id,
  u2.name as reported_user_name,
  ur.reason,
  ur.status,
  ur.admin_notes,
  ur.created_at
FROM user_reports ur
LEFT JOIN users u1 ON ur.reporter_id = u1.id
LEFT JOIN users u2 ON ur.reported_user_id = u2.id
WHERE ur.status = 'blocked'
ORDER BY ur.created_at DESC;

-- Test the blocking function manually (replace with actual IDs)
-- Uncomment and replace the IDs below to test blocking
/*
-- Example: Block a user manually
INSERT INTO blocked_users (user_id, blocked_user_id, reason, blocked_by_admin, created_at)
VALUES (
  'admin-user-id-here',  -- Replace with actual admin user ID
  'user-to-block-id-here',  -- Replace with actual user ID to block
  'Test blocking from admin',
  true,
  NOW()
);

-- Update the corresponding report status
UPDATE user_reports
SET status = 'blocked',
    admin_notes = 'User blocked by admin for testing',
    updated_at = NOW()
WHERE reported_user_id = 'user-to-block-id-here'  -- Replace with actual user ID
  AND status != 'blocked';
*/

-- Check RLS policies that might be blocking operations
SELECT 'RLS policies on blocked_users:' as status;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'blocked_users';

SELECT 'RLS policies on user_reports:' as status;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_reports';

-- Test if we can insert into blocked_users as an admin
-- This will help identify if RLS is the issue
SELECT 'Testing RLS permissions:' as status;

-- Check if the current user can see blocked_users records
-- (This would be run in the context of an admin user)
-- SELECT COUNT(*) as visible_blocked_users FROM blocked_users;

-- Check if we can see user_reports
-- SELECT COUNT(*) as visible_reports FROM user_reports;

-- If RLS is blocking, we might need to adjust the policies
-- Let's check what the current policies allow

-- For blocked_users, users should be able to insert if they are the blocker
-- Admins should be able to see all blocked users

-- For user_reports, users should be able to see their own reports
-- Admins should be able to see all reports and update them

-- If the policies are too restrictive, we can adjust them
-- But first, let's see what the current policies are

-- Create a simple test to verify the blocking logic works
DO $$
DECLARE
    test_admin_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with actual admin ID
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';  -- Replace with actual user ID
    test_report_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with actual report ID
BEGIN
    -- This is just a template - replace the IDs above with real ones to test

    RAISE NOTICE 'Test blocking setup complete. Replace the UUIDs above with real IDs to test blocking.';
END $$;