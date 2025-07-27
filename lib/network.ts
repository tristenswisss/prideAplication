"use client"

import NetInfo from "@react-native-community/netinfo"
import { useState, useEffect } from "react"

export interface NetworkState {
  isConnected: boolean
  isInternetReachable: boolean
  type: string
}

export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: false,
    isInternetReachable: false,
    type: "unknown",
  })

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      })
    })

    return () => unsubscribe()
  }, [])

  return networkState
}

export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch()
    return (state.isConnected ?? false) && (state.isInternetReachable ?? false)
  } catch (error) {
    console.error("Error checking network connection:", error)
    return false
  }
}
