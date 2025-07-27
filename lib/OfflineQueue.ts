import { storage, STORAGE_KEYS } from "./storage"
import { checkNetworkConnection } from "./network"

export interface OfflineAction {
  id: string
  type: "RSVP_EVENT" | "ADD_REVIEW" | "UPDATE_PROFILE" | "FAVORITE_BUSINESS"
  data: any
  timestamp: number
  retryCount: number
}

export const offlineQueue = {
  // Add action to offline queue
  addAction: async (type: OfflineAction["type"], data: any): Promise<void> => {
    try {
      const actions = (await storage.getItem<OfflineAction[]>(STORAGE_KEYS.OFFLINE_ACTIONS)) || []
      const newAction: OfflineAction = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      }
      actions.push(newAction)
      await storage.setItem(STORAGE_KEYS.OFFLINE_ACTIONS, actions)
    } catch (error) {
      console.error("Error adding offline action:", error)
    }
  },

  // Get all pending actions
  getActions: async (): Promise<OfflineAction[]> => {
    try {
      return (await storage.getItem<OfflineAction[]>(STORAGE_KEYS.OFFLINE_ACTIONS)) || []
    } catch (error) {
      console.error("Error getting offline actions:", error)
      return []
    }
  },

  // Remove action from queue
  removeAction: async (actionId: string): Promise<void> => {
    try {
      const actions = (await storage.getItem<OfflineAction[]>(STORAGE_KEYS.OFFLINE_ACTIONS)) || []
      const filteredActions = actions.filter((action) => action.id !== actionId)
      await storage.setItem(STORAGE_KEYS.OFFLINE_ACTIONS, filteredActions)
    } catch (error) {
      console.error("Error removing offline action:", error)
    }
  },

  // Process all pending actions when online
  processQueue: async (): Promise<void> => {
    const isOnline = await checkNetworkConnection()
    if (!isOnline) return

    try {
      const actions = await offlineQueue.getActions()
      for (const action of actions) {
        try {
          await processOfflineAction(action)
          await offlineQueue.removeAction(action.id)
        } catch (error) {
          console.error(`Error processing action ${action.id}:`, error)
          // Increment retry count
          action.retryCount++
          if (action.retryCount >= 3) {
            // Remove after 3 failed attempts
            await offlineQueue.removeAction(action.id)
          }
        }
      }
    } catch (error) {
      console.error("Error processing offline queue:", error)
    }
  },

  // Clear all actions
  clearQueue: async (): Promise<void> => {
    try {
      await storage.removeItem(STORAGE_KEYS.OFFLINE_ACTIONS)
    } catch (error) {
      console.error("Error clearing offline queue:", error)
    }
  },
}

// Process individual offline actions
const processOfflineAction = async (action: OfflineAction): Promise<void> => {
  switch (action.type) {
    case "RSVP_EVENT":
      // Process RSVP when back online
      console.log("Processing offline RSVP:", action.data)
      break
    case "ADD_REVIEW":
      // Process review when back online
      console.log("Processing offline review:", action.data)
      break
    case "UPDATE_PROFILE":
      // Process profile update when back online
      console.log("Processing offline profile update:", action.data)
      break
    case "FAVORITE_BUSINESS":
      // Process favorite when back online
      console.log("Processing offline favorite:", action.data)
      break
    default:
      console.warn("Unknown offline action type:", action.type)
  }
}
