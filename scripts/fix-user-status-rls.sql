-- Fix User Status RLS Policy Issues
-- This script addresses the RLS policy violations for the user_status table

-- First, check if user_status table exists and what its structure is
SELECT 'Checking user_status table structure:' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_status'
ORDER BY ordinal_position;

-- Check if user_status table has RLS enabled
SELECT 'Checking RLS status for user_status:' as status;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_status';

-- Check existing RLS policies for user_status
SELECT 'Checking existing RLS policies for user_status:' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_status';

-- If user_status table doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_status'
    ) THEN
        CREATE TABLE public.user_status (
            user_id uuid NOT NULL,
            is_online boolean NOT NULL DEFAULT false,
            last_seen timestamp with time zone,
            updated_at timestamp with time zone NOT NULL DEFAULT now(),
            CONSTRAINT user_status_pkey PRIMARY KEY (user_id),
            CONSTRAINT user_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
        );

        -- Create index for better performance
        CREATE INDEX idx_user_status_user_id ON public.user_status(user_id);
        CREATE INDEX idx_user_status_is_online ON public.user_status(is_online);

        RAISE NOTICE 'Created user_status table';
    ELSE
        RAISE NOTICE 'user_status table already exists';
    END IF;
END $$;

-- Enable RLS on user_status table if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'user_status'
        AND c.relrowsecurity = true
        AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on user_status';
    ELSE
        RAISE NOTICE 'RLS already enabled on user_status';
    END IF;
END $$;

-- Drop existing policies if they exist and recreate them properly
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own status" ON user_status;
    DROP POLICY IF EXISTS "Users can insert their own status" ON user_status;
    DROP POLICY IF EXISTS "Users can update their own status" ON user_status;

    -- Create new policies that allow users to manage their own status
    CREATE POLICY "Users can view their own status" ON public.user_status
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own status" ON public.user_status
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own status" ON public.user_status
        FOR UPDATE USING (auth.uid() = user_id);

    -- Allow admins to view all user statuses
    CREATE POLICY "Admins can view all user statuses" ON public.user_status
        FOR SELECT USING (
            auth.jwt() ->> 'role' = 'admin' OR
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (users.role = 'admin' OR users.is_admin = true)
            )
        );

    RAISE NOTICE 'Created proper RLS policies for user_status';
END $$;

-- Test the policies by checking what a user can do
-- This will help verify the policies are working correctly

-- Create a function to test user_status operations
CREATE OR REPLACE FUNCTION test_user_status_access(test_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
BEGIN
    -- Test SELECT
    BEGIN
        PERFORM * FROM user_status WHERE user_id = test_user_id;
        result_text := result_text || 'SELECT: OK | ';
    EXCEPTION WHEN OTHERS THEN
        result_text := result_text || 'SELECT: ERROR - ' || SQLERRM || ' | ';
    END;

    -- Test INSERT
    BEGIN
        INSERT INTO user_status (user_id, is_online, last_seen)
        VALUES (test_user_id, true, NOW())
        ON CONFLICT (user_id) DO NOTHING;
        result_text := result_text || 'INSERT: OK | ';
    EXCEPTION WHEN OTHERS THEN
        result_text := result_text || 'INSERT: ERROR - ' || SQLERRM || ' | ';
    END;

    -- Test UPDATE
    BEGIN
        UPDATE user_status
        SET is_online = false, last_seen = NOW(), updated_at = NOW()
        WHERE user_id = test_user_id;
        result_text := result_text || 'UPDATE: OK';
    EXCEPTION WHEN OTHERS THEN
        result_text := result_text || 'UPDATE: ERROR - ' || SQLERRM;
    END;

    RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final verification
SELECT 'Final verification - user_status table info:' as status;
SELECT COUNT(*) as total_user_status_records FROM user_status;

SELECT 'Final verification - RLS policies:' as status;
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_status';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== USER STATUS RLS FIX COMPLETE ===';
    RAISE NOTICE '1. Ensured user_status table exists with proper structure';
    RAISE NOTICE '2. Enabled RLS on user_status table';
    RAISE NOTICE '3. Created proper RLS policies for user status management';
    RAISE NOTICE '4. Users should now be able to update their online/offline status';
    RAISE NOTICE '5. Admins can view all user statuses';
END $$;