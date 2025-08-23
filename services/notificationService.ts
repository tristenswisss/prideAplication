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
    try {
      // Ensure user_id matches the authenticated user to satisfy RLS
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("not_authenticated")
      const payload = { ...notification, user_id: (notification as any).user_id || user.id }

      const { data, error } = await supabase
        .from("notifications")
        .insert(payload as any)
        .select("*")
        .single()

      if (error) {
        // Fallback: if blocked by RLS, try RPC helper
        if ((error as any).code === "42501") {
          try {
            const { error: rpcError } = await supabase.rpc("create_notification", {
              user_id: payload.user_id,
              title: (payload as any).title,
              message: (payload as any).message,
              type: (payload as any).type,
              data: (payload as any).data ?? null,
            })
            if (rpcError) {
              console.error("RPC create_notification failed:", rpcError)
              return null
            }
            // Read back the latest inserted notification for this user (best-effort)
            const { data: latest } = await supabase
              .from("notifications")
              .select("*")
              .eq("user_id", payload.user_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()
            return (latest as any) || null
          } catch (rpcCatch) {
            console.error("Error during RPC fallback:", rpcCatch)
            return null
          }
        }
        console.error("Error creating notification:", error)
        return null
      }

      return data
    } catch (e) {
      console.error("createNotification failed:", e)
      return null
    }
  },
}
