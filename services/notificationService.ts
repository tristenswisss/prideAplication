import { mockNotifications } from "../data/mockAtendees"
import type { Notification } from "../types"

export const notificationService = {
  // Get user notifications
  getUserNotifications: async (userId: string): Promise<Notification[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockNotifications
      .filter((notification) => notification.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const notification = mockNotifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    mockNotifications.filter((n) => n.user_id === userId).forEach((n) => (n.read = true))
  },

  // Get unread count
  getUnreadCount: async (userId: string): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    return mockNotifications.filter((n) => n.user_id === userId && !n.read).length
  },

  // Create notification (for demo purposes)
  createNotification: async (notification: Omit<Notification, "id" | "created_at">): Promise<Notification> => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    }
    mockNotifications.push(newNotification)
    return newNotification
  },
}
