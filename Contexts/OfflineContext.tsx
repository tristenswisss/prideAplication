"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useNetworkState } from "../lib/network"
import { offlineQueue } from "../lib/OfflineQueue"
import { storage, STORAGE_KEYS } from "../lib/storage"
import { Alert } from "react-native"

interface OfflineContextType {
  isOnline: boolean
  isOfflineMode: boolean
  pendingActions: number
  syncData: () => Promise<void>
  enableOfflineMode: () => void
  disableOfflineMode: () => void
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const useOffline = () => {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider")
  }
  return context
}

interface OfflineProviderProps {
  children: ReactNode
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const networkState = useNetworkState()
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [pendingActions, setPendingActions] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    loadOfflineState()
  }, [])

  useEffect(() => {
    updatePendingActionsCount()
  }, [networkState.isConnected])

  useEffect(() => {
    // Auto-sync when coming back online
    if (networkState.isConnected && pendingActions > 0) {
      syncData()
    }
  }, [networkState.isConnected, pendingActions])

  const loadOfflineState = async () => {
    try {
      const offlineMode = await storage.getItem<boolean>("offline_mode")
      const lastSync = await storage.getItem<string>(STORAGE_KEYS.LAST_SYNC)

      if (offlineMode) setIsOfflineMode(offlineMode)
      if (lastSync) setLastSyncTime(new Date(lastSync))

      await updatePendingActionsCount()
    } catch (error) {
      console.error("Error loading offline state:", error)
    }
  }

  const updatePendingActionsCount = async () => {
    try {
      const actions = await offlineQueue.getActions()
      setPendingActions(actions.length)
    } catch (error) {
      console.error("Error updating pending actions count:", error)
    }
  }

  const syncData = async () => {
    try {
      if (!networkState.isConnected) {
        Alert.alert("No Connection", "Please check your internet connection and try again.")
        return
      }

      // Process offline queue
      await offlineQueue.processQueue()

      // Update sync time
      const now = new Date()
      await storage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString())
      setLastSyncTime(now)

      // Update pending actions count
      await updatePendingActionsCount()

      Alert.alert("Sync Complete", "Your data has been synchronized successfully.")
    } catch (error) {
      console.error("Error syncing data:", error)
      Alert.alert("Sync Failed", "Failed to sync your data. Please try again.")
    }
  }

  const enableOfflineMode = async () => {
    try {
      setIsOfflineMode(true)
      await storage.setItem("offline_mode", true)
      Alert.alert(
        "Offline Mode Enabled",
        "You can now use the app without an internet connection. Your actions will be synced when you're back online.",
      )
    } catch (error) {
      console.error("Error enabling offline mode:", error)
    }
  }

  const disableOfflineMode = async () => {
    try {
      setIsOfflineMode(false)
      await storage.setItem("offline_mode", false)

      if (networkState.isConnected && pendingActions > 0) {
        await syncData()
      }
    } catch (error) {
      console.error("Error disabling offline mode:", error)
    }
  }

  const value: OfflineContextType = {
    isOnline: networkState.isConnected,
    isOfflineMode,
    pendingActions,
    syncData,
    enableOfflineMode,
    disableOfflineMode,
  }

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}
