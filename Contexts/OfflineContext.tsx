"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import NetInfo from "@react-native-community/netinfo"

interface OfflineContextType {
  isConnected: boolean
  isOffline: boolean
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const useOffline = () => {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider")
  }
  return context
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const value = {
    isConnected,
    isOffline: !isConnected,
  }

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}
