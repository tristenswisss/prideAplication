import * as Notifications from "expo-notifications"
import * as Location from "expo-location"
import { storage } from "../lib/storage"
import type { PushNotification } from "../types/social"
import type { Event } from "../types"

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // ✅ required
    shouldShowList: true,   // ✅ required
  }),
})


export const pushNotificationService = {
  // Initialize push notifications
  initialize: async (): Promise<string | null> => {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== "granted") {
        console.log("Push notification permissions not granted")
        return null
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data
      console.log("Push token:", token)

      // Store token locally
      await storage.setItem("push_token", token)

      return token
    } catch (error) {
      console.error("Error initializing push notifications:", error)
      return null
    }
  },

  // Schedule local notification
  scheduleLocalNotification: async (
    title: string,
    body: string,
    data: any = {},
    trigger?: Notifications.NotificationTriggerInput,
  ): Promise<string> => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: trigger || null,
      })
      return id
    } catch (error) {
      console.error("Error scheduling notification:", error)
      throw error
    }
  },

  // Schedule event reminder
  scheduleEventReminder: async (event: Event, reminderMinutes = 60): Promise<void> => {
    try {
      const eventDateTime = new Date(`${event.date}T${event.start_time}`)
      const reminderTime = new Date(eventDateTime.getTime() - reminderMinutes * 60 * 1000)

      if (reminderTime > new Date()) {
        await pushNotificationService.scheduleLocalNotification(
          `Event Reminder: ${event.title}`,
          `Starting in ${reminderMinutes} minutes at ${event.location}`,
          { type: "calender", event_id: event.id ,
           date: reminderTime },
        )
      }
    } catch (error) {
      console.error("Error scheduling event reminder:", error)
    }
  },

  // Check for nearby events and send notifications
  checkNearbyEvents: async (userLocation: { latitude: number; longitude: number }): Promise<void> => {
    try {
      // Get cached events
      const events = (await storage.getCacheItem<Event[]>("events")) || []
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Find upcoming events within 5km
      const nearbyEvents = events.filter((event) => {
        const eventDate = new Date(event.date)
        const isUpcoming = eventDate >= now && eventDate <= tomorrow

        if (!isUpcoming || !event.latitude || !event.longitude) return false

        // Calculate distance (rough approximation)
        const distance = Math.sqrt(
          Math.pow(event.latitude - userLocation.latitude, 2) + Math.pow(event.longitude - userLocation.longitude, 2),
        )

        return distance <= 0.045 // Roughly 5km
      })

      // Send notifications for new nearby events
      const notifiedEvents = (await storage.getItem<string[]>("notified_events")) || []

      for (const event of nearbyEvents) {
        if (!notifiedEvents.includes(event.id)) {
          await pushNotificationService.scheduleLocalNotification(
            "🎉 Event Near You!",
            `${event.title} is happening nearby tomorrow at ${event.location}`,
            { type: "nearby_event", event_id: event.id },
          )

          notifiedEvents.push(event.id)
        }
      }

      await storage.setItem("notified_events", notifiedEvents)
    } catch (error) {
      console.error("Error checking nearby events:", error)
    }
  },

  // Start location-based notifications
  startLocationNotifications: async (): Promise<void> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.log("Location permission not granted")
        return
      }

      // Check nearby events every hour
      setInterval(
        async () => {
          try {
            const location = await Location.getCurrentPositionAsync({})
            await pushNotificationService.checkNearbyEvents({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            })
          } catch (error) {
            console.error("Error in location notification check:", error)
          }
        },
        60 * 60 * 1000,
      ) // 1 hour

      // Initial check
      const location = await Location.getCurrentPositionAsync({})
      await pushNotificationService.checkNearbyEvents({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
    } catch (error) {
      console.error("Error starting location notifications:", error)
    }
  },

  // Send social notification
  sendSocialNotification: async (
    userId: string,
    type: "new_follower" | "post_like" | "comment",
    data: any,
  ): Promise<void> => {
    try {
      let title = ""
      let body = ""

      switch (type) {
        case "new_follower":
          title = "New Follower! 👥"
          body = `${data.followerName} started following you`
          break
        case "post_like":
          title = "Post Liked! ❤️"
          body = `${data.likerName} liked your post`
          break
        case "comment":
          title = "New Comment! 💬"
          body = `${data.commenterName} commented on your post`
          break
      }

      await pushNotificationService.scheduleLocalNotification(title, body, { type, ...data })
    } catch (error) {
      console.error("Error sending social notification:", error)
    }
  },

  // Get notification history
  getNotificationHistory: async (): Promise<PushNotification[]> => {
    try {
      return (await storage.getItem<PushNotification[]>("notification_history")) || []
    } catch (error) {
      console.error("Error getting notification history:", error)
      return []
    }
  },

  // Clear all notifications
  clearAllNotifications: async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync()
      await storage.removeItem("notification_history")
    } catch (error) {
      console.error("Error clearing notifications:", error)
    }
  },
}
