# User Reporting System Database Updates

## Overview
This directory contains the database migration scripts needed to enable the user reporting and blocking system in your Mirae app.

## Files
- `apply-reporting-updates.sql` - Comprehensive database update script (adds everything)
- `check-and-fix-schema.sql` - Smart script that only adds what's missing
- `fix-admin-blocking.sql` - Fixes admin blocking issues and permissions
- `fix-user-status-rls.sql` - Fixes RLS policies for user_status table (online/offline)
- `debug-blocking.sql` - Debug script to check blocking system status
- `debug-login-blocking.sql` - **NEW**: Debug script specifically for login blocking issues
- `add-is-blocked-column.sql` - **NEW**: Adds is_blocked column to users table for easier querying
- `check-is-blocked-column.sql` - **NEW**: Checks if is_blocked column exists and user status
- `test-blocking-check.sql` - **NEW**: Tests the exact queries used in blocking check
- `test-blocking-fix.sql` - Test script for blocking functionality
- `README-reporting-updates.md` - This documentation file

## How to Apply Updates

### Option 1: Smart Check & Fix (Recommended)
Use this if your database already has some of the tables/columns:
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `check-and-fix-schema.sql`
4. Paste and run the script
5. **This script is safe to run multiple times** - it only adds what's missing

### Option 2: Full Update Script
Use this if you want to ensure everything is added (may show "already exists" warnings):
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `apply-reporting-updates.sql`
4. Paste and run the script

### Option 3: Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push
```

## What Gets Updated

### 1. user_reports Table
- ✅ Adds `status` column (pending, reviewed, resolved, blocked)
- ✅ Adds `admin_notes` column for admin comments
- ✅ Adds `updated_at` column for tracking changes

### 2. blocked_users Table
- ✅ Adds `reason` column for block reason
- ✅ Adds `blocked_by_admin` column to distinguish admin blocks

### 3. unblock_requests Table (New)
- ✅ Creates complete table structure
- ✅ Proper foreign key relationships
- ✅ Status tracking (pending, approved, denied)
- ✅ Admin review workflow

### 4. Row Level Security (RLS) Policies
- ✅ Users can create and view their own reports/requests
- ✅ Admins can view and manage all reports and requests
- ✅ Proper access controls for all operations

### 5. Performance Indexes
- ✅ Indexes on status and created_at columns
- ✅ Optimized queries for better performance

## Expected Results

After running the script, you should see:
- ✅ No more "column does not exist" errors
- ✅ No more "table does not exist" errors
- ✅ User reporting features work correctly
- ✅ Admin blocking/unblocking works
- ✅ Unblock request system functions properly

## Troubleshooting

### If you get "policyname does not exist" errors:
The script uses the correct PostgreSQL column names for your version. If you still get errors, your PostgreSQL version might be different. Check your Supabase project settings.

### If you get "table already exists" errors:
The script uses `IF NOT EXISTS` clauses, so it's safe to run multiple times. These errors are normal and can be ignored.

### If you get permission errors:
Make sure you're running the script as a database administrator or with sufficient privileges in your Supabase project.

### If admin blocking doesn't work:
1. Run `fix-admin-blocking.sql` to fix admin permissions and RLS policies
2. Check that your admin user has `is_admin = true` or `role = 'admin'`
3. The script will update RLS policies to work with both authentication methods
4. Check browser console for detailed error messages from the improved logging

### If blocked users can still log in:
1. Run `debug-login-blocking.sql` to check the current state
2. Check browser console for detailed logging during login process
3. Verify that blocked users have `is_blocked = true` in users table OR are in `blocked_users` table
4. Check that the AuthScreen is correctly checking for blocked status
5. The `check-and-fix-schema.sql` script ensures data consistency
6. **FIXED**: Updated `checkIfUserIsBlocked` to check both `is_blocked` column and `blocked_users` table

### If you get "user_status" RLS policy errors:
1. Run `scripts/fix-user-status-rls.sql` to fix the RLS policies
2. This script creates proper policies for the user_status table
3. Users will be able to update their online/offline status
4. Admins can view all user statuses
5. The script includes a test function to verify the fix

### If you want an is_blocked column in the users table:
1. Run `scripts/add-is-blocked-column.sql` to add the column
2. This creates an `is_blocked` boolean column in the users table
3. The column is automatically updated when users are blocked/unblocked
4. You can now easily query: `SELECT * FROM users WHERE is_blocked = true`
5. This is optional - the blocking system works without it
6. **Fixed**: Removed invalid `WITH CHECK` clause from SELECT policy

### If blocked users can still log in (login blocking not working):
1. **Run the debug script**: `scripts/debug-login-blocking.sql` to check the current state
2. **Check browser console**: The app now has detailed logging during login
3. **Verify database state**: Make sure users are actually blocked in the `blocked_users` table
4. **Check RLS policies**: The debug script will show if there are policy issues
5. **Test the blocking check**: Use the manual query in the debug script to test specific users
6. **Verify admin blocking worked**: Check that the `blockUser` function completed successfully

**Common causes:**
- User was never actually blocked in the database
- RLS policies preventing the blocking check query
- Admin blocking operation failed silently
- Mismatch between `blocked_users` and `user_reports` tables

## Post-Update Verification

After applying the updates:
1. Try reporting a user from their profile
2. Check that the report appears in the admin dashboard
3. Test blocking a user as an admin
4. Verify that blocked users can request unblocking
5. Confirm that admins can approve/deny unblock requests

## Support

If you encounter any issues:
1. Check the Supabase logs in your project dashboard
2. Verify that all prerequisites are met
3. Ensure you're using the latest version of the script

The user reporting and blocking system should now be fully functional! 🎉