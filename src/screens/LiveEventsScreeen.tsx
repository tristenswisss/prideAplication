"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  Alert,
  RefreshControl,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { liveEventService } from "../../services/liveEventService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { LiveEvent } from "../../types/messaging"
import AppModal from "../../components/AppModal"

interface LiveEventsScreenProps {
  navigation: any
}

export default function LiveEventsScreen({ navigation }: LiveEventsScreenProps) {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joinPickerVisible, setJoinPickerVisible] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    loadLiveEvents()

    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(loadLiveEvents, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadLiveEvents = async () => {
    try {
      setLoading(true)
      const data = await liveEventService.getLiveEvents()
      setLiveEvents(data)
    } catch (error) {
      console.error("Error loading live events:", error)
      Alert.alert("Error", "Failed to load live events")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleJoinLiveEvent = (liveEvent: LiveEvent) => {
    navigation.navigate("LiveEvent", { liveEvent })
  }

  const handleCreateLiveEvent = async () => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to create a live event")
      return
    }
    try {
      const defaultTitle = `${user.name || "Host"}'s Live Event`
      const created = await liveEventService.createLiveEvent(undefined, user.id, defaultTitle, "")
      navigation.navigate("LiveEvent", { liveEvent: created })
    } catch (e: any) {
      console.error("Error creating live event:", e)
      Alert.alert("Error", e?.message || "Failed to create live event")
    }
  }

  const handleOpenJoinPicker = () => {
    const anyLive = liveEvents.some((e) => e.is_live)
    if (!anyLive) {
      Alert.alert("No live events", "There are no live events at the moment. Check back soon or create one.")
      return
    }
    setJoinPickerVisible(true)
  }

  const formatEventTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderLiveEvent = ({ item }: { item: LiveEvent }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => handleJoinLiveEvent(item)}>
      <View style={styles.eventImageContainer}>
        <LinearGradient colors={item.is_live ? ["#FF4444", "#FF6B6B"] : ["#ccc", "#999"]} style={styles.eventImage}>
          <MaterialIcons name={item.is_live ? "videocam" : "videocam-off"} size={40} color="white" />
        </LinearGradient>

        {item.is_live && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        <View style={styles.viewerBadge}>
          <MaterialIcons name="visibility" size={12} color="white" />
          <Text style={styles.viewerCount}>{item.is_live ? item.viewer_count : item.max_viewers}</Text>
        </View>
      </View>

      <View style={styles.eventInfo}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.eventTime}>
            {item.is_live ? "Live now" : item.started_at ? formatEventTime(item.started_at) : "Scheduled"}
          </Text>
        </View>

        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.eventFooter}>
          <View style={styles.hostInfo}>
            <Image
              source={{ uri: item.host?.avatar_url || "/placeholder.svg?height=24&width=24&text=H" }}
              style={styles.hostAvatar}
            />
            <Text style={styles.hostName}>{item.host?.name || "Unknown Host"}</Text>
            {item.host?.verified && <MaterialIcons name="verified" size={14} color="#4CAF50" />}
          </View>

          <View style={styles.eventActions}>
            {item.is_live ? (
              <View style={styles.joinButton}>
                <MaterialIcons name="play-arrow" size={16} color="white" />
                <Text style={styles.joinButtonText}>Join</Text>
              </View>
            ) : (
              <View style={styles.endedButton}>
                <Text style={styles.endedButtonText}>Ended</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Events</Text>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialIcons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Join live streams from the community</Text>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, styles.createButton]} onPress={handleCreateLiveEvent}>
          <MaterialIcons name="videocam" size={18} color="white" />
          <Text style={styles.actionButtonText}>Create Live Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.joinNowButton]} onPress={handleOpenJoinPicker}>
          <MaterialIcons name="play-arrow" size={18} color="white" />
          <Text style={styles.actionButtonText}>Join Live Event</Text>
        </TouchableOpacity>
      </View>

      {/* Live Events List */}
      <FlatList
        data={liveEvents}
        renderItem={renderLiveEvent}
        keyExtractor={(item) => item.id}
        style={styles.eventsList}
        contentContainerStyle={styles.eventsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadLiveEvents()
            }}
            colors={["#FF6B6B"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="videocam-off" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No live events</Text>
            <Text style={styles.emptyStateSubtitle}>Check back later for live streams from the community</Text>
          </View>
        }
        ListHeaderComponent={
          liveEvents.filter((event) => event.is_live).length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔴 Live Now</Text>
            </View>
          ) : null
        }
      />

      {/* Join Picker Modal */}
      <AppModal
        visible={joinPickerVisible}
        onClose={() => setJoinPickerVisible(false)}
        title="Join a Live Event"
        leftAction={{ label: "Close", onPress: () => setJoinPickerVisible(false) }}
        variant="center"
      >
        <FlatList
          data={liveEvents.filter((e) => e.is_live)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setJoinPickerVisible(false)
                handleJoinLiveEvent(item)
              }}
            >
              <MaterialIcons name="live-tv" size={18} color="#FF4444" />
              <Text style={styles.modalItemText}>{item.title}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No live events right now</Text>
            </View>
          }
        />
      </AppModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  headerAction: {
    padding: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createButton: {
    backgroundColor: "#4ECDC4",
    flex: 1,
    marginRight: 8,
    justifyContent: "center",
  },
  joinNowButton: {
    backgroundColor: "#FF6B6B",
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
  },
  eventsList: {
    flex: 1,
  },
  eventsContent: {
    padding: 15,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: "hidden",
  },
  eventImageContainer: {
    position: "relative",
    height: 120,
  },
  eventImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  liveIndicator: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
  },
  viewerBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  viewerCount: {
    fontSize: 10,
    color: "white",
    marginLeft: 2,
  },
  eventInfo: {
    padding: 15,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  eventTime: {
    fontSize: 12,
    color: "#666",
  },
  eventDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hostInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  hostName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginRight: 4,
  },
  eventActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  joinButtonText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
    marginLeft: 2,
  },
  endedButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  endedButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: 380,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  modalItemText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
    flexShrink: 1,
  },
  modalEmpty: {
    paddingVertical: 20,
    alignItems: "center",
  },
  modalEmptyText: {
    color: "#666",
  },
})
