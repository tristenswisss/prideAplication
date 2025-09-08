-- Fix Notifications RLS Policy Issue
-- This script adds the missing INSERT policy for notifications table

-- Step 1: Add INSERT policy for notifications - users can create notifications for themselves
CREATE POLICY "Users can create their own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 2: Create or replace the RPC function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_notification(
  user_id uuid,
  title text,
  message text,
  type text,
  data jsonb DEFAULT NULL
) RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate that the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Insert the notification
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (user_id, title, message, type, data);
END;
$$;

-- Step 3: Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, jsonb) TO authenticated;

-- Step 4: Verify the policies are in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;