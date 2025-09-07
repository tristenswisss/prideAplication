import { supabase } from "../lib/supabase"

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export interface UserReport {
  id: string
  reporter_id: string
  reported_user_id: string
  reason: string
  details?: string
  status: 'pending' | 'reviewed' | 'resolved' | 'blocked'
  admin_notes?: string
  created_at: string
  updated_at?: string
  reporter?: { name: string; email: string }
  reported_user?: { name: string; email: string }
}

export const adminService = {
  // Get all user reports for admin review
  getAllReports: async (): Promise<{ success: boolean; data?: UserReport[]; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:users!reporter_id(name, email),
          reported_user:users!reported_user_id(name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching reports:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getAllReports:", error)
      return { success: false, error: error.message }
    }
  },

  // Update report status and admin notes
  updateReport: async (
    reportId: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'blocked',
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({
          status,
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) {
        console.error("Error updating report:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in updateReport:", error)
      return { success: false, error: error.message }
    }
  },

  // Block a user (admin action)
  blockUser: async (
    userIdToBlock: string,
    reportId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("Starting blockUser process for user:", userIdToBlock)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error("Block user failed: Not authenticated")
        return { success: false, error: "Not authenticated" }
      }

      console.log("Admin user authenticated:", user.email)

      // Check if admin has permission
      const isAdmin = await adminService.isCurrentUserAdmin()
      if (!isAdmin) {
        console.error("Block user failed: User is not admin")
        return { success: false, error: "Insufficient permissions" }
      }

      console.log("Admin permission confirmed")

      // First, block the user
      console.log("Inserting into blocked_users table...")
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          user_id: user.id, // Admin's ID (who is doing the blocking)
          blocked_user_id: userIdToBlock, // User to be blocked
          reason,
          blocked_by_admin: true,
          created_at: new Date().toISOString()
        })

      if (blockError) {
        if (blockError.message.includes('duplicate key')) {
          console.log("User already blocked, continuing...")
        } else {
          console.error("Error blocking user:", blockError)
          return { success: false, error: `Failed to block user: ${blockError.message}` }
        }
      } else {
        console.log("User successfully added to blocked_users table")
      }

      // Then, update the report status to 'blocked'
      console.log("Updating report status...")
      const { error: reportError } = await supabase
        .from('user_reports')
        .update({
          status: 'blocked',
          admin_notes: `User blocked by admin ${user.email} for: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (reportError) {
        console.error("Error updating report status:", reportError)
        return { success: false, error: `Failed to update report: ${reportError.message}` }
      }

      console.log("Report status updated successfully")
      console.log("Block user process completed successfully")

      return { success: true }
    } catch (error: any) {
      console.error("Error in blockUser:", error)
      return { success: false, error: `Unexpected error: ${error.message}` }
    }
  },

  // Unblock a user (admin action)
  unblockUser: async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocked_user_id', userId)
        .eq('blocked_by_admin', true)

      if (error) {
        console.error("Error unblocking user:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in unblockUser:", error)
      return { success: false, error: error.message }
    }
  },

  // Get all blocked users
  getBlockedUsers: async (): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(`
          *,
          user:users!user_id(name, email),
          blocked_user:users!blocked_user_id(name, email)
        `)
        .eq('blocked_by_admin', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching blocked users:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getBlockedUsers:", error)
      return { success: false, error: error.message }
    }
  },

  // Check if current user is admin
  isCurrentUserAdmin: async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      // Prefer admin_users membership (avoids users policy recursion and is explicit)
      const { data: adminRow, error: adminErr } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (!adminErr && adminRow) return true

      // Fallback to users flags for backward compatibility
      const { data, error } = await supabase
        .from('users')
        .select('role, is_admin')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error("Error checking admin status:", error)
        return false
      }

      const isAdmin = (data?.role === 'admin' || data?.is_admin === true)
      if (isAdmin) console.log("User is admin:", user.email)
      return isAdmin
    } catch (error) {
      console.error("Error in isCurrentUserAdmin:", error)
      return false
    }
  },

  // Place Suggestions Management
  getPlaceSuggestions: async (status: "pending" | "approved" | "rejected" = "pending"): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('safe_space_suggestions')
        .select(`
          *,
          suggested_by_user:users!suggested_by(name, email)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching place suggestions:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getPlaceSuggestions:", error)
      return { success: false, error: error.message }
    }
  },

  approvePlaceSuggestion: async (suggestionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get the suggestion details
      const { data: suggestion, error: fetchError } = await supabase
        .from('safe_space_suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single()

      if (fetchError || !suggestion) {
        return { success: false, error: fetchError?.message || "Suggestion not found" }
      }

      const normalizeCategory = (cat?: string | null) => {
        const c = (cat || '').toLowerCase().trim()
        switch (c) {
          case 'organization':
            return 'organization'
          case 'clinic':
          case 'healthcare':
            return 'clinic'
          case 'restaurant':
            return 'restaurant'
          case 'cafe':
            return 'cafe'
          case 'drop_in_center':
            return 'drop_in_center'
          case 'community_center':
          case 'other':
          default:
            return 'organization'
        }
      }

      // Create the approved safe space
      const safeSpacePayload = {
        name: suggestion.name,
        description: suggestion.description,
        category: normalizeCategory(suggestion.category),
        address: suggestion.address,
        city: suggestion.city,
        country: suggestion.country,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        phone: suggestion.phone,
        email: suggestion.email,
        website: suggestion.website,
        services: suggestion.services || [],
        lgbtq_friendly: suggestion.lgbtq_friendly,
        trans_friendly: suggestion.trans_friendly,
        wheelchair_accessible: suggestion.wheelchair_accessible,
        verified: true,
      }

      const { error: insertError } = await supabase
        .from('safe_spaces')
        .insert(safeSpacePayload)

      if (insertError) {
        console.error("Error inserting approved safe space:", insertError)
        return { success: false, error: insertError.message }
      }

      // Update the suggestion status
      const { error: updateError } = await supabase
        .from('safe_space_suggestions')
        .update({ status: 'approved' })
        .eq('id', suggestionId)

      if (updateError) {
        console.error("Error updating suggestion status:", updateError)
        return { success: false, error: updateError.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in approvePlaceSuggestion:", error)
      return { success: false, error: error.message }
    }
  },

  rejectPlaceSuggestion: async (suggestionId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('safe_space_suggestions')
        .update({
          status: 'rejected',
          rejection_reason: reason || null
        })
        .eq('id', suggestionId)

      if (error) {
        console.error("Error rejecting place suggestion:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in rejectPlaceSuggestion:", error)
      return { success: false, error: error.message }
    }
  },

  // Unblock Request Management
  createUnblockRequest: async (
    reportId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: "Not authenticated" }
      }

      // Build payload and include report_id only if it's a valid UUID
      const payload: any = {
        user_id: user.id,
        reason,
        created_at: new Date().toISOString()
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (reportId && uuidRegex.test(reportId)) {
        payload.report_id = reportId
      }

      const { error } = await supabase
        .from('unblock_requests')
        .insert(payload)

      if (error) {
        console.error("Error creating unblock request:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in createUnblockRequest:", error)
      return { success: false, error: error.message }
    }
  },

  getUnblockRequests: async (): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('unblock_requests')
        .select(`
          *,
          user:users!user_id(name, email),
          report:user_reports!report_id(reason, details)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Error fetching unblock requests:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      console.error("Error in getUnblockRequests:", error)
      return { success: false, error: error.message }
    }
  },

  approveUnblockRequest: async (
    requestId: string,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: "Not authenticated" }
      }

      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('unblock_requests')
        .select('user_id, report_id')
        .eq('id', requestId)
        .single()

      if (fetchError || !request) {
        return { success: false, error: fetchError?.message || "Request not found" }
      }

      // Unblock the user
      const { error: unblockError } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocked_user_id', request.user_id)
        .eq('blocked_by_admin', true)

      if (unblockError) {
        console.error("Error unblocking user:", unblockError)
        return { success: false, error: unblockError.message }
      }

      // Explicitly update the user's is_blocked status to false
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_blocked: false })
        .eq('id', request.user_id)

      if (updateError) {
        console.error("Error updating user blocked status:", updateError)
        return { success: false, error: updateError.message }
      }

      // Update report status back to 'reviewed' only if report_id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (request.report_id && uuidRegex.test(request.report_id)) {
        const { error: reportError } = await supabase
          .from('user_reports')
          .update({
            status: 'reviewed',
            admin_notes: 'User unblocked upon request approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', request.report_id)

        if (reportError) {
          console.error("Error updating report:", reportError)
          return { success: false, error: reportError.message }
        }
      }

      // Update the unblock request status
      const { error: requestError } = await supabase
        .from('unblock_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (requestError) {
        console.error("Error updating unblock request:", requestError)
        return { success: false, error: requestError.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in approveUnblockRequest:", error)
      return { success: false, error: error.message }
    }
  },

  denyUnblockRequest: async (
    requestId: string,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: "Not authenticated" }
      }

      const { error } = await supabase
        .from('unblock_requests')
        .update({
          status: 'denied',
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) {
        console.error("Error denying unblock request:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in denyUnblockRequest:", error)
      return { success: false, error: error.message }
    }
  },



  // Check if user is blocked
  checkIfUserIsBlocked: async (userId: string): Promise<{ isBlocked: boolean; reason?: string; reportId?: string }> => {
    try {
      console.log("checkIfUserIsBlocked called for user:", userId)

      // First, check the is_blocked column in users table (if it exists)
      console.log("Checking is_blocked column in users table...")
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_blocked')
        .eq('id', userId)
        .single()

      console.log("User is_blocked check result:", { userData, userError })

      // If user has is_blocked = true, they're blocked
      if (userData?.is_blocked === true) {
        console.log("✅ User is blocked according to is_blocked column")

        // Try to get blocking details from blocked_users table
        const { data: blockData, error: blockError } = await supabase
          .from('blocked_users')
          .select('reason')
          .eq('blocked_user_id', userId)
          .eq('blocked_by_admin', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        console.log("Block details query result:", { blockData, blockError })

        // Get associated report
        const { data: reportData, error: reportError } = await supabase
          .from('user_reports')
          .select('id')
          .eq('reported_user_id', userId)
          .eq('status', 'blocked')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        console.log("Report query result:", { reportData, reportError })

        const result = {
          isBlocked: true,
          reason: blockData?.reason || "Account blocked by administrator",
          reportId: reportData?.id
        }

        console.log("✅ checkIfUserIsBlocked returning (blocked):", result)
        return result
      } else if (userData?.is_blocked === false) {
        console.log("User is not blocked according to is_blocked column (false)")
      } else {
        console.log("is_blocked column not found or null:", userData?.is_blocked)
      }

      // Fallback: Check blocked_users table directly (for backward compatibility)
      console.log("Checking blocked_users table as fallback...")
      const { data, error } = await supabase
        .from('blocked_users')
        .select('reason')
        .eq('blocked_user_id', userId)
        .eq('blocked_by_admin', true)
        .single()

      console.log("Blocked users fallback query result:", { data, error })

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error("Error checking blocked_users table:", error)
        return { isBlocked: false }
      }

      if (data) {
        console.log("User is blocked according to blocked_users table")

        // Get the associated report
        const { data: reportData, error: reportError } = await supabase
          .from('user_reports')
          .select('id')
          .eq('reported_user_id', userId)
          .eq('status', 'blocked')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        console.log("Report query result:", { reportData, reportError })

        const result = {
          isBlocked: true,
          reason: data.reason,
          reportId: reportData?.id
        }

        console.log("checkIfUserIsBlocked returning (blocked from table):", result)
        return result
      }

      console.log("User is not blocked")
      return { isBlocked: false }
    } catch (error: any) {
      console.error("Error in checkIfUserIsBlocked:", error)
      return { isBlocked: false }
    }
  }
}