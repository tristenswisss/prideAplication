"use client"

import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useOffline } from "../Contexts/OfflineContext"

export default function OfflineStatus() {
  const { isOnline, isOfflineMode, pendingActions, syncData } = useOffline()

  if (isOnline && pendingActions === 0) return null

  return (
    <View style={[styles.container, !isOnline && styles.offlineContainer]}>
      <View style={styles.content}>
        <MaterialIcons name={!isOnline ? "cloud-off" : "sync"} size={20} color={!isOnline ? "#FF6B6B" : "#4ECDC4"} />
        <Text style={[styles.text, !isOnline && styles.offlineText]}>
          {!isOnline ? "You're offline" : pendingActions > 0 ? `${pendingActions} actions pending sync` : "All synced"}
        </Text>
      </View>

      {isOnline && pendingActions > 0 && (
        <TouchableOpacity style={styles.syncButton} onPress={syncData}>
          <Text style={styles.syncButtonText}>Sync</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 8,
  },
  offlineContainer: {
    backgroundColor: "#FFEBEE",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: "#4CAF50",
    marginLeft: 8,
    fontWeight: "600",
  },
  offlineText: {
    color: "#FF6B6B",
  },
  syncButton: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  syncButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
})
