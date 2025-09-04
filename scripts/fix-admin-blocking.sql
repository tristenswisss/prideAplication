-- Fix Admin Blocking Issues
-- This script addresses the admin authentication and blocking problems

-- First, let's check the current admin users and their roles
SELECT 'Current admin users:' as status;
SELECT id, email, name, role, is_admin
FROM users
WHERE is_admin = true OR role = 'admin';

-- Update admin users to have the correct role if they don't have it
UPDATE users
SET role = 'admin'
WHERE is_admin = true AND (role IS NULL OR role != 'admin');

-- Check if the JWT role claim is working correctly
-- The issue might be that the JWT doesn't include the role claim

-- Let's check the RLS policies and see if we need to adjust them
SELECT 'Current RLS policies on blocked_users:' as status;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'blocked_users';

SELECT 'Current RLS policies on user_reports:' as status;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_reports';

-- The issue might be that the JWT role claim is not being set correctly
-- Let's create a more permissive policy that also checks the is_admin column

-- Drop the existing admin policies and recreate them with better logic
DO $$
BEGIN
    -- Drop existing admin policies if they exist
    DROP POLICY IF EXISTS "Admins can view all user reports" ON user_reports;
    DROP POLICY IF EXISTS "Admins can update user reports" ON user_reports;
    DROP POLICY IF EXISTS "Admins can view all unblock requests" ON unblock_requests;
    DROP POLICY IF EXISTS "Admins can update unblock requests" ON unblock_requests;

    -- Create new policies that check both role and is_admin
    CREATE POLICY "Admins can view all user reports" ON user_reports
        FOR SELECT USING (
            auth.jwt() ->> 'role' = 'admin' OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        );

    CREATE POLICY "Admins can update user reports" ON user_reports
        FOR UPDATE USING (
            auth.jwt() ->> 'role' = 'admin' OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        );

    CREATE POLICY "Admins can view all unblock requests" ON unblock_requests
        FOR SELECT USING (
            auth.jwt() ->> 'role' = 'admin' OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        );

    CREATE POLICY "Admins can update unblock requests" ON unblock_requests
        FOR UPDATE USING (
            auth.jwt() ->> 'role' = 'admin' OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        );

    -- Also update the blocked_users policies to be more permissive for admins
    DROP POLICY IF EXISTS "Users can block other users" ON blocked_users;
    CREATE POLICY "Users can block other users" ON blocked_users
        FOR INSERT WITH CHECK (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        );

    RAISE NOTICE 'Updated RLS policies to be more permissive for admins';
END $$;

-- Test the blocking functionality
-- Let's create a test to see if we can insert into blocked_users

-- First, let's see if there are any existing blocked users
SELECT 'Existing blocked users:' as status;
SELECT COUNT(*) as blocked_count FROM blocked_users WHERE blocked_by_admin = true;

-- Check if there are any reports that should be blocked
SELECT 'Reports that should be blocked:' as status;
SELECT COUNT(*) as reports_to_block FROM user_reports WHERE status = 'blocked';

-- If there are no blocked users but there are blocked reports, there's a mismatch
-- Let's fix this by ensuring all blocked reports have corresponding blocked_users entries

INSERT INTO blocked_users (user_id, blocked_user_id, reason, blocked_by_admin, created_at)
SELECT
    '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder admin ID
    ur.reported_user_id,
    COALESCE(ur.admin_notes, ur.reason),
    true,
    ur.updated_at
FROM user_reports ur
WHERE ur.status = 'blocked'
AND NOT EXISTS (
    SELECT 1 FROM blocked_users bu
    WHERE bu.blocked_user_id = ur.reported_user_id
    AND bu.blocked_by_admin = true
);

-- Update the placeholder admin ID with a real admin ID if available
UPDATE blocked_users
SET user_id = (
    SELECT id FROM users
    WHERE role = 'admin' OR is_admin = true
    ORDER BY created_at ASC
    LIMIT 1
)
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
AND blocked_by_admin = true;

-- Final verification
SELECT 'Final check - blocked users count:' as status;
SELECT COUNT(*) as final_blocked_count FROM blocked_users WHERE blocked_by_admin = true;

SELECT 'Final check - blocked reports count:' as status;
SELECT COUNT(*) as final_blocked_reports FROM user_reports WHERE status = 'blocked';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== ADMIN BLOCKING FIX COMPLETE ===';
    RAISE NOTICE '1. Updated admin user roles';
    RAISE NOTICE '2. Fixed RLS policies to work with both role and is_admin';
    RAISE NOTICE '3. Ensured blocked reports have corresponding blocked_users entries';
    RAISE NOTICE '4. Admin blocking should now work correctly';
END $$;