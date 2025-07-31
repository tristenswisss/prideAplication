"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, Alert, Modal } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { liveStreamingService, type StreamRecording } from "../../services/liveStreamingService"

interface RecordingsScreenProps {
  navigation: any
}

export default function RecordingsScreen({ navigation }: RecordingsScreenProps) {
  const [recordings, setRecordings] = useState<StreamRecording[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRecording, setSelectedRecording] = useState<StreamRecording | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const data = await liveStreamingService.getRecordings()
      setRecordings(data)
    } catch (error) {
      console.error("Error loading recordings:", error)
      Alert.alert("Error", "Failed to load recordings")
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`
    }
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  const handlePlayRecording = (recording: StreamRecording) => {
    setSelectedRecording(recording)
    setShowPlayer(true)
  }

  const handleDownloadRecording = (recording: StreamRecording) => {
    Alert.alert(
      "Download Recording",
      `Download "${recording.live_event_id}" recording (${formatFileSize(recording.file_size)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download",
          onPress: () => {
            // In a real app, this would initiate the download
            Alert.alert("Download Started", "Recording download has started")
          },
        },
      ],
    )
  }

  const handleShareRecording = (recording: StreamRecording) => {
    Alert.alert("Share Recording", "Share this recording with others?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Share",
        onPress: () => {
          // In a real app, this would open share options
          Alert.alert("Shared", "Recording link copied to clipboard")
        },
      },
    ])
  }

  const renderRecording = ({ item }: { item: StreamRecording }) => (
    <View style={styles.recordingCard}>
      <View style={styles.recordingThumbnail}>
        <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.thumbnailGradient}>
          <MaterialIcons name="play-circle-filled" size={40} color="white" />
        </LinearGradient>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </View>

      <View style={styles.recordingInfo}>
        <Text style={styles.recordingTitle} numberOfLines={2}>
          Live Event Recording
        </Text>
        <Text style={styles.recordingId}>ID: {item.live_event_id}</Text>

        <View style={styles.recordingMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="high-quality" size={14} color="#666" />
            <Text style={styles.metaText}>{item.quality.resolution}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="storage" size={14} color="#666" />
            <Text style={styles.metaText}>{formatFileSize(item.file_size)}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={14} color="#666" />
            <Text style={styles.metaText}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.recordingActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handlePlayRecording(item)}>
            <MaterialIcons name="play-arrow" size={20} color="#4ECDC4" />
            <Text style={styles.actionButtonText}>Play</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleDownloadRecording(item)}>
            <MaterialIcons name="download" size={20} color="#4ECDC4" />
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleShareRecording(item)}>
            <MaterialIcons name="share" size={20} color="#4ECDC4" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recordings</Text>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialIcons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Your saved live event recordings</Text>
      </LinearGradient>

      {/* Recordings List */}
      <FlatList
        data={recordings}
        renderItem={renderRecording}
        keyExtractor={(item) => item.id}
        style={styles.recordingsList}
        contentContainerStyle={styles.recordingsContent}
        refreshing={loading}
        onRefresh={loadRecordings}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="videocam-off" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No recordings yet</Text>
            <Text style={styles.emptyStateSubtitle}>Recordings from live events will appear here</Text>
          </View>
        }
      />

      {/* Video Player Modal */}
      <Modal visible={showPlayer} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.playerContainer}>
          <View style={styles.playerHeader}>
            <TouchableOpacity onPress={() => setShowPlayer(false)} style={styles.playerCloseButton}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.playerTitle}>{selectedRecording?.live_event_id || "Recording"}</Text>
            <TouchableOpacity style={styles.playerAction}>
              <MaterialIcons name="more-vert" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.videoPlayer}>
            <LinearGradient colors={["#333", "#666"]} style={styles.videoPlaceholder}>
              <MaterialIcons name="play-circle-filled" size={80} color="white" />
              <Text style={styles.videoPlaceholderText}>Video Player</Text>
              <Text style={styles.videoPlaceholderSubtext}>
                {selectedRecording && formatDuration(selectedRecording.duration)}
              </Text>
            </LinearGradient>

            {/* Video Controls */}
            <View style={styles.videoControls}>
              <TouchableOpacity style={styles.videoControlButton}>
                <MaterialIcons name="replay-10" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.videoControlButton}>
                <MaterialIcons name="play-arrow" size={32} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.videoControlButton}>
                <MaterialIcons name="forward-10" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
  recordingsList: {
    flex: 1,
  },
  recordingsContent: {
    padding: 15,
  },
  recordingCard: {
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
  recordingThumbnail: {
    height: 120,
    position: "relative",
  },
  thumbnailGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  recordingInfo: {
    padding: 15,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  recordingId: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  recordingMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  recordingActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: "#f8f9fa",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#4ECDC4",
    fontWeight: "600",
    marginLeft: 4,
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
  playerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  playerCloseButton: {
    padding: 5,
  },
  playerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  playerAction: {
    padding: 5,
  },
  videoPlayer: {
    flex: 1,
    position: "relative",
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
  },
  videoPlaceholderSubtext: {
    color: "white",
    fontSize: 16,
    opacity: 0.8,
    marginTop: 5,
  },
  videoControls: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  videoControlButton: {
    marginHorizontal: 20,
    padding: 10,
  },
})
