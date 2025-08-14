import { supabase } from "../lib/supabase"
import type { Notification } from "../types"

export const notificationService = {
  // Get user notifications
  getUserNotifications: async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notifications:", error)
      return []
    }

    return data || []
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)

    if (error) {
      console.error("Error marking notification as read:", error)
      throw error
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)

    if (error) {
      console.error("Error marking all notifications as read:", error)
      throw error
    }
  },

  // Get unread count
  getUnreadCount: async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (error) {
      console.error("Error fetching unread notification count:", error)
      return 0
    }

    return count || 0
  },

  // Create notification
  createNotification: async (
    notification: Omit<Notification, "id" | "created_at">,
  ): Promise<Notification | null> => {
    const { data, error } = await supabase
      .from("notifications")
      .insert(notification)
      .select("*")
      .single()

    if (error) {
      console.error("Error creating notification:", error)
      return null
    }

    return data
  },
}
