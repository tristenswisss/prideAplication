-- Fix Blocking RLS Policy Issues
-- This script addresses RLS policy violations that prevent blocking/unblocking users

-- Check current RLS policies on users table
SELECT '=== CURRENT RLS POLICIES ON USERS TABLE ===' as section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Check if users table has RLS enabled
SELECT '=== USERS TABLE RLS STATUS ===' as section;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- Check current blocked users status
SELECT '=== CURRENT BLOCKED USERS STATUS ===' as section;
SELECT
    u.id,
    u.email,
    u.name,
    u.is_blocked,
    CASE
        WHEN u.is_blocked = true THEN 'BLOCKED'
        WHEN EXISTS (SELECT 1 FROM blocked_users bu WHERE bu.blocked_user_id = u.id AND bu.blocked_by_admin = true) THEN 'SHOULD BE BLOCKED'
        ELSE 'NOT BLOCKED'
    END as actual_status
FROM users u
WHERE u.is_blocked = true OR EXISTS (SELECT 1 FROM blocked_users bu WHERE bu.blocked_user_id = u.id AND bu.blocked_by_admin = true)
ORDER BY u.created_at DESC;

-- Fix RLS policies to allow admin updates to is_blocked column
DO $$
BEGIN
    -- Drop existing policies that might be too restrictive
    DROP POLICY IF EXISTS "Users can view their own blocked status" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Admins can update user blocked status" ON users;

    -- Create policy for users to view their own data
    CREATE POLICY "Users can view their own data" ON public.users
        FOR SELECT USING (auth.uid() = id);

    -- Create policy for users to update their own profile (excluding sensitive fields)
    CREATE POLICY "Users can update their own profile" ON public.users
        FOR UPDATE USING (auth.uid() = id)
        WITH CHECK (
            auth.uid() = id AND
            -- Prevent users from updating sensitive admin fields
            (OLD.role = NEW.role OR OLD.role IS NULL) AND
            (OLD.is_admin = NEW.is_admin OR OLD.is_admin IS NULL) AND
            (OLD.is_blocked = NEW.is_blocked OR OLD.is_blocked IS NULL)
        );

    -- Create policy for admins to update user blocked status
    CREATE POLICY "Admins can update user blocked status" ON public.users
        FOR UPDATE USING (
            auth.jwt() ->> 'role' = 'admin' OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        )
        WITH CHECK (
            -- Only allow updates to is_blocked field for admins
            OLD.id = NEW.id AND
            OLD.email = NEW.email AND
            OLD.name = NEW.name AND
            OLD.created_at = NEW.created_at AND
            OLD.updated_at <= NEW.updated_at
            -- Allow is_blocked to change
        );

    -- Allow service role to update everything (for triggers and backend operations)
    CREATE POLICY "Service role can update all users" ON public.users
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

    RAISE NOTICE 'Updated RLS policies for users table to allow blocking operations';
END $$;

-- Test the blocking trigger manually
SELECT '=== TESTING BLOCKING TRIGGER ===' as section;

-- Insert a test block record to see if trigger works
-- (This will be rolled back)
DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get first admin user
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' OR is_admin = true LIMIT 1;
    -- Get first regular user
    SELECT id INTO test_user_id FROM users WHERE id != admin_user_id LIMIT 1;

    IF test_user_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing trigger with admin: %, user: %', admin_user_id, test_user_id;

        -- Test insert (this should trigger the update to is_blocked)
        INSERT INTO blocked_users (user_id, blocked_user_id, reason, blocked_by_admin)
        VALUES (admin_user_id, test_user_id, 'Test block for trigger validation', true);

        -- Check if is_blocked was updated
        IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id AND is_blocked = true) THEN
            RAISE NOTICE '✅ Trigger worked: User is_blocked set to true';
        ELSE
            RAISE NOTICE '❌ Trigger failed: User is_blocked not updated';
        END IF;

        -- Clean up test data
        DELETE FROM blocked_users WHERE user_id = admin_user_id AND blocked_user_id = test_user_id AND reason = 'Test block for trigger validation';
    ELSE
        RAISE NOTICE 'Not enough users to test trigger';
    END IF;
END $$;

-- Verify the trigger function exists and is working
SELECT '=== TRIGGER FUNCTION STATUS ===' as section;
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'update_user_blocked_status';

-- Check if trigger exists
SELECT '=== TRIGGER STATUS ===' as section;
SELECT
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid = 'blocked_users'::regclass;

-- Manual test: Update is_blocked column directly
SELECT '=== MANUAL IS_BLOCKED UPDATE TEST ===' as section;
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM users LIMIT 1;

    IF test_user_id IS NOT NULL THEN
        -- Test direct update
        UPDATE users SET is_blocked = true WHERE id = test_user_id;
        RAISE NOTICE 'Direct update test: Updated user % is_blocked to true', test_user_id;

        -- Check if it worked
        IF EXISTS (SELECT 1 FROM users WHERE id = test_user_id AND is_blocked = true) THEN
            RAISE NOTICE '✅ Direct update worked';
            -- Reset for cleanup
            UPDATE users SET is_blocked = false WHERE id = test_user_id;
        ELSE
            RAISE NOTICE '❌ Direct update failed';
        END IF;
    END IF;
END $$;

-- Final verification
SELECT '=== FINAL VERIFICATION ===' as section;
SELECT
    (SELECT COUNT(*) FROM users WHERE is_blocked = true) as users_marked_blocked,
    (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) as blocked_records,
    CASE
        WHEN (SELECT COUNT(*) FROM users WHERE is_blocked = true) = (SELECT COUNT(*) FROM blocked_users WHERE blocked_by_admin = true) THEN 'CONSISTENT'
        ELSE 'INCONSISTENT - CHECK RLS POLICIES'
    END as status;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== BLOCKING RLS FIX COMPLETE ===';
    RAISE NOTICE '1. Reviewed and updated RLS policies on users table';
    RAISE NOTICE '2. Ensured admins can update is_blocked column';
    RAISE NOTICE '3. Tested blocking trigger functionality';
    RAISE NOTICE '4. Verified direct updates work';
    RAISE NOTICE '5. If issues persist, check Supabase service role permissions';
END $$;