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
  status: 'pending' | 'reviewed' | 'resolved'
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
    status: 'pending' | 'reviewed' | 'resolved',
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
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: "Not authenticated" }
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: user.id, // Admin's ID (who is doing the blocking)
          blocked_user_id: userIdToBlock, // User to be blocked
          reason,
          blocked_by_admin: true,
          created_at: new Date().toISOString()
        })

      if (error && !error.message.includes('duplicate key')) {
        console.error("Error blocking user:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      console.error("Error in blockUser:", error)
      return { success: false, error: error.message }
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

      const { data, error } = await supabase
        .from('users')
        .select('role, is_admin')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error("Error checking admin status:", error)
        return false
      }

      return (data?.role === 'admin' || data?.is_admin === true)
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

      // Create the approved safe space
      const safeSpacePayload = {
        name: suggestion.name,
        description: suggestion.description,
        category: suggestion.category,
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
  }
}