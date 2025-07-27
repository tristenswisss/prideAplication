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

interface LiveEventsScreenProps {
  navigation: any
}

export default function LiveEventsScreen({ navigation }: LiveEventsScreenProps) {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

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
})
