-- Apply User Reporting and Blocking System Updates
-- Run this script in your Supabase SQL editor to add the missing tables and columns

-- Add missing columns to user_reports table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_reports' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_reports ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_reports' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE user_reports ADD COLUMN admin_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_reports' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE user_reports ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add missing columns to blocked_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocked_users' AND column_name = 'reason'
  ) THEN
    ALTER TABLE blocked_users ADD COLUMN reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blocked_users' AND column_name = 'blocked_by_admin'
  ) THEN
    ALTER TABLE blocked_users ADD COLUMN blocked_by_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create unblock_requests table
CREATE TABLE IF NOT EXISTS unblock_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES user_reports(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on unblock_requests
ALTER TABLE unblock_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for unblock_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create unblock requests' AND tablename = 'unblock_requests'
  ) THEN
    CREATE POLICY "Users can create unblock requests" ON unblock_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own unblock requests' AND tablename = 'unblock_requests'
  ) THEN
    CREATE POLICY "Users can view their own unblock requests" ON unblock_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all unblock requests' AND tablename = 'unblock_requests'
  ) THEN
    CREATE POLICY "Admins can view all unblock requests" ON unblock_requests
      FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update unblock requests' AND tablename = 'unblock_requests'
  ) THEN
    CREATE POLICY "Admins can update unblock requests" ON unblock_requests
      FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- Update existing user_reports policies to include admin access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all user reports' AND tablename = 'user_reports'
  ) THEN
    CREATE POLICY "Admins can view all user reports" ON user_reports
      FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update user reports' AND tablename = 'user_reports'
  ) THEN
    CREATE POLICY "Admins can update user reports" ON user_reports
      FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_unblock_requests_status ON unblock_requests(status);
CREATE INDEX IF NOT EXISTS idx_unblock_requests_created_at ON unblock_requests(created_at);