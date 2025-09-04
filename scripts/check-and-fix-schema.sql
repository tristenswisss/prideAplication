-- Check and Fix User Reporting System Schema
-- This script checks what's missing and only adds what's needed

-- Check if unblock_requests table exists and has correct structure
DO $$
BEGIN
    -- Check if unblock_requests table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'unblock_requests'
    ) THEN
        -- Create unblock_requests table if it doesn't exist
        CREATE TABLE public.unblock_requests (
            id uuid NOT NULL DEFAULT uuid_generate_v4(),
            user_id uuid,
            report_id uuid,
            reason text NOT NULL,
            status character varying DEFAULT 'pending'::character varying,
            admin_notes text,
            reviewed_by uuid,
            reviewed_at timestamp with time zone,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            CONSTRAINT unblock_requests_pkey PRIMARY KEY (id),
            CONSTRAINT unblock_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
            CONSTRAINT unblock_requests_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.user_reports(id),
            CONSTRAINT unblock_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
        );
        RAISE NOTICE 'Created unblock_requests table';
    ELSE
        RAISE NOTICE 'unblock_requests table already exists';
    END IF;
END $$;

-- Check and add missing columns to user_reports table
DO $$
BEGIN
    -- Check status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_reports' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.user_reports ADD COLUMN status character varying DEFAULT 'pending'::character varying;
        RAISE NOTICE 'Added status column to user_reports';
    ELSE
        RAISE NOTICE 'status column already exists in user_reports';
    END IF;

    -- Check admin_notes column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_reports' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.user_reports ADD COLUMN admin_notes text;
        RAISE NOTICE 'Added admin_notes column to user_reports';
    ELSE
        RAISE NOTICE 'admin_notes column already exists in user_reports';
    END IF;

    -- Check updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_reports' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.user_reports ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        RAISE NOTICE 'Added updated_at column to user_reports';
    ELSE
        RAISE NOTICE 'updated_at column already exists in user_reports';
    END IF;
END $$;

-- Check and add missing columns to blocked_users table
DO $$
BEGIN
    -- Check reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'blocked_users' AND column_name = 'reason'
    ) THEN
        ALTER TABLE public.blocked_users ADD COLUMN reason text;
        RAISE NOTICE 'Added reason column to blocked_users';
    ELSE
        RAISE NOTICE 'reason column already exists in blocked_users';
    END IF;

    -- Check blocked_by_admin column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'blocked_users' AND column_name = 'blocked_by_admin'
    ) THEN
        ALTER TABLE public.blocked_users ADD COLUMN blocked_by_admin boolean DEFAULT false;
        RAISE NOTICE 'Added blocked_by_admin column to blocked_users';
    ELSE
        RAISE NOTICE 'blocked_by_admin column already exists in blocked_users';
    END IF;
END $$;

-- Enable RLS on tables if not already enabled
DO $$
BEGIN
    -- Enable RLS on user_reports if not enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'user_reports'
        AND c.relrowsecurity = true
        AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on user_reports';
    ELSE
        RAISE NOTICE 'RLS already enabled on user_reports';
    END IF;

    -- Enable RLS on unblock_requests if not enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'unblock_requests'
        AND c.relrowsecurity = true
        AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.unblock_requests ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on unblock_requests';
    ELSE
        RAISE NOTICE 'RLS already enabled on unblock_requests';
    END IF;
END $$;

-- Add RLS policies for user_reports (admin access)
DO $$
BEGIN
    -- Check if admin view policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can view all user reports' AND tablename = 'user_reports'
    ) THEN
        CREATE POLICY "Admins can view all user reports" ON public.user_reports
            FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
        RAISE NOTICE 'Added admin view policy for user_reports';
    ELSE
        RAISE NOTICE 'Admin view policy already exists for user_reports';
    END IF;

    -- Check if admin update policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can update user reports' AND tablename = 'user_reports'
    ) THEN
        CREATE POLICY "Admins can update user reports" ON public.user_reports
            FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
        RAISE NOTICE 'Added admin update policy for user_reports';
    ELSE
        RAISE NOTICE 'Admin update policy already exists for user_reports';
    END IF;
END $$;

-- Add RLS policies for unblock_requests
DO $$
BEGIN
    -- Check if user create policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can create unblock requests' AND tablename = 'unblock_requests'
    ) THEN
        CREATE POLICY "Users can create unblock requests" ON public.unblock_requests
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Added user create policy for unblock_requests';
    ELSE
        RAISE NOTICE 'User create policy already exists for unblock_requests';
    END IF;

    -- Check if user view policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Users can view their own unblock requests' AND tablename = 'unblock_requests'
    ) THEN
        CREATE POLICY "Users can view their own unblock requests" ON public.unblock_requests
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Added user view policy for unblock_requests';
    ELSE
        RAISE NOTICE 'User view policy already exists for unblock_requests';
    END IF;

    -- Check if admin view policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can view all unblock requests' AND tablename = 'unblock_requests'
    ) THEN
        CREATE POLICY "Admins can view all unblock requests" ON public.unblock_requests
            FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
        RAISE NOTICE 'Added admin view policy for unblock_requests';
    ELSE
        RAISE NOTICE 'Admin view policy already exists for unblock_requests';
    END IF;

    -- Check if admin update policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Admins can update unblock requests' AND tablename = 'unblock_requests'
    ) THEN
        CREATE POLICY "Admins can update unblock requests" ON public.unblock_requests
            FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
        RAISE NOTICE 'Added admin update policy for unblock_requests';
    ELSE
        RAISE NOTICE 'Admin update policy already exists for unblock_requests';
    END IF;
END $$;

-- Create indexes for better performance
DO $$
BEGIN
    -- Index for user_reports status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_reports' AND indexname = 'idx_user_reports_status'
    ) THEN
        CREATE INDEX idx_user_reports_status ON public.user_reports(status);
        RAISE NOTICE 'Created index on user_reports(status)';
    ELSE
        RAISE NOTICE 'Index on user_reports(status) already exists';
    END IF;

    -- Index for user_reports created_at
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'user_reports' AND indexname = 'idx_user_reports_created_at'
    ) THEN
        CREATE INDEX idx_user_reports_created_at ON public.user_reports(created_at);
        RAISE NOTICE 'Created index on user_reports(created_at)';
    ELSE
        RAISE NOTICE 'Index on user_reports(created_at) already exists';
    END IF;

    -- Index for unblock_requests status
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'unblock_requests' AND indexname = 'idx_unblock_requests_status'
    ) THEN
        CREATE INDEX idx_unblock_requests_status ON public.unblock_requests(status);
        RAISE NOTICE 'Created index on unblock_requests(status)';
    ELSE
        RAISE NOTICE 'Index on unblock_requests(status) already exists';
    END IF;

    -- Index for unblock_requests created_at
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'unblock_requests' AND indexname = 'idx_unblock_requests_created_at'
    ) THEN
        CREATE INDEX idx_unblock_requests_created_at ON public.unblock_requests(created_at);
        RAISE NOTICE 'Created index on unblock_requests(created_at)';
    ELSE
        RAISE NOTICE 'Index on unblock_requests(created_at) already exists';
    END IF;
END $$;

-- Final status report
DO $$
BEGIN
    RAISE NOTICE '=== SCHEMA CHECK COMPLETE ===';
    RAISE NOTICE 'All necessary tables, columns, policies, and indexes have been verified/created.';
    RAISE NOTICE 'The user reporting and blocking system should now work correctly.';
END $$;