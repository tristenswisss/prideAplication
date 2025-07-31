"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
  TextInput,
  Alert,
  Dimensions,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { liveEventService } from "../../services/liveEventService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { LiveEvent, LiveMessage } from "../../types/messaging"
import { liveStreamingService, type StreamRecording } from "../../services/liveStreamingService"
import { callingService } from "../../services/callingService"

// Import the type for StackScreenProps
import type { StackScreenProps } from "@react-navigation/stack"
import type { EventsStackParamList } from "../../types/navigation"

// Define the props type using the navigation type
type LiveEventScreenProps = StackScreenProps<EventsStackParamList, "LiveEvent">

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")

export default function LiveEventScreen({ navigation, route }: LiveEventScreenProps) {
  const { liveEvent: initialLiveEvent } = route.params
  const [liveEvent, setLiveEvent] = useState<LiveEvent>(initialLiveEvent)
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [showChat, setShowChat] = useState(true)
  const [isJoined, setIsJoined] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const { user } = useAuth()

  const [isRecording, setIsRecording] = useState(false)
  const [currentRecording, setCurrentRecording] = useState<StreamRecording | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [streamQuality, setStreamQuality] = useState<"720p" | "1080p" | "4K">("1080p")

  useEffect(() => {
    if (liveEvent.is_live) {
      joinStream()
      loadMessages()

      // Simulate real-time updates
      const interval = setInterval(() => {
        loadMessages()
        updateViewerCount()
      }, 3000)

      return () => {
        clearInterval(interval)
        if (isJoined) {
          leaveStream()
        }
      }
    }
  }, [])

  const joinStream = async () => {
    if (!user || isJoined) return

    try {
      await liveEventService.joinLiveStream(liveEvent.id, user.id)
      setIsJoined(true)
    } catch (error) {
      console.error("Error joining stream:", error)
    }
  }

  const leaveStream = async () => {
    if (!user || !isJoined) return

    try {
      await liveEventService.leaveLiveStream(liveEvent.id, user.id)
      setIsJoined(false)
    } catch (error) {
      console.error("Error leaving stream:", error)
    }
  }

  const loadMessages = async () => {
    try {
      const data = await liveEventService.getLiveMessages(liveEvent.id)
      setMessages(data)

      // Auto scroll to bottom for new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error("Error loading live messages:", error)
    }
  }

  const updateViewerCount = async () => {
    try {
      const updatedEvent = await liveEventService.getLiveEvent(liveEvent.id)
      if (updatedEvent) {
        setLiveEvent(updatedEvent)
      }
    } catch (error) {
      console.error("Error updating viewer count:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const messageContent = newMessage.trim()
    setNewMessage("")

    try {
      const message = await liveEventService.sendLiveMessage(liveEvent.id, user.id, messageContent)
      setMessages((prev) => [...prev, message])
    } catch (error) {
      console.error("Error sending live message:", error)
      Alert.alert("Error", "Failed to send message")
      setNewMessage(messageContent) // Restore message
    }
  }

  const handleSendReaction = async (reaction: string) => {
    if (!user) return

    try {
      await liveEventService.sendReaction(liveEvent.id, user.id, reaction)
      // Reactions will appear in the message stream
    } catch (error) {
      console.error("Error sending reaction:", error)
    }
  }

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderLiveMessage = ({ item }: { item: LiveMessage }) => {
    if (item.message_type === "reaction") {
      return (
        <View style={styles.reactionMessage}>
          <Text style={styles.reactionText}>{item.content}</Text>
        </View>
      )
    }

    if (item.message_type === "join" || item.message_type === "leave") {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>
            {item.user?.name || "Someone"} {item.content}
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.chatMessage}>
        <Image
          source={{ uri: item.user?.avatar_url || "/placeholder.svg?height=30&width=30&text=U" }}
          style={styles.chatAvatar}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatMessageHeader}>
            <Text style={styles.chatUsername}>{item.user?.name || "Anonymous"}</Text>
            {item.user?.verified && <MaterialIcons name="verified" size={12} color="#4CAF50" />}
            <Text style={styles.chatTime}>{formatMessageTime(item.sent_at)}</Text>
          </View>
          <Text style={styles.chatText}>{item.content}</Text>
        </View>
      </View>
    )
  }

  const handleStartRecording = async () => {
    if (!user) return

    try {
      const recording = await liveStreamingService.startRecording(liveEvent.id, {
        resolution: streamQuality,
        bitrate: streamQuality === "4K" ? 8000 : streamQuality === "1080p" ? 5000 : 3000,
        fps: 30,
      })
      setCurrentRecording(recording)
      setIsRecording(true)
      Alert.alert("Recording Started", "Live stream recording has started")
    } catch (error) {
      Alert.alert("Error", "Failed to start recording")
    }
  }

  const handleStopRecording = async () => {
    try {
      const recording = await liveStreamingService.stopRecording(liveEvent.id)
      setCurrentRecording(recording)
      setIsRecording(false)
      Alert.alert("Recording Saved", "Your recording has been saved and will be available in your recordings library")
    } catch (error) {
      Alert.alert("Error", "Failed to stop recording")
    }
  }

  const handleStartScreenShare = async () => {
    if (!user) return

    try {
      await callingService.startScreenShare(user.id, liveEvent.id)
      setIsScreenSharing(true)
      Alert.alert("Screen Sharing", "Screen sharing has started")
    } catch (error) {
      Alert.alert("Error", "Failed to start screen sharing")
    }
  }

  const handleStopScreenShare = async () => {
    try {
      await callingService.stopScreenShare(liveEvent.id)
      setIsScreenSharing(false)
      Alert.alert("Screen Sharing Stopped", "Screen sharing has been stopped")
    } catch (error) {
      Alert.alert("Error", "Failed to stop screen sharing")
    }
  }

  const handleQualityChange = async (quality: "720p" | "1080p" | "4K") => {
    try {
      await liveStreamingService.updateStreamQuality(liveEvent.id, {
        resolution: quality,
        bitrate: quality === "4K" ? 8000 : quality === "1080p" ? 5000 : 3000,
        fps: 30,
      })
      setStreamQuality(quality)
      Alert.alert("Quality Updated", `Stream quality changed to ${quality}`)
    } catch (error) {
      Alert.alert("Error", "Failed to update stream quality")
    }
  }

  if (!liveEvent.is_live) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.offlineContainer}>
          <MaterialIcons name="videocam-off" size={64} color="#ccc" />
          <Text style={styles.offlineTitle}>Stream Ended</Text>
          <Text style={styles.offlineSubtitle}>This live event has ended</Text>
          <Text style={styles.offlineStats}>
            Max viewers: {liveEvent.max_viewers} • Duration: {liveEvent.ended_at ? "Ended" : "Not started"}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {liveEvent.title}
          </Text>
          <View style={styles.headerStats}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.viewerCount}>{liveEvent.viewer_count} viewers</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <MaterialIcons name="more-vert" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Video Stream Area */}
      <View style={styles.videoContainer}>
        <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.videoPlaceholder}>
          <MaterialIcons name="videocam" size={64} color="white" />
          <Text style={styles.videoPlaceholderText}>Live Stream</Text>
          <Text style={styles.videoPlaceholderSubtext}>Hosted by {liveEvent.host?.name}</Text>
        </LinearGradient>

        {/* Floating Reactions */}
        <View style={styles.reactionsContainer}>
          <TouchableOpacity style={styles.reactionButton} onPress={() => handleSendReaction("❤️")}>
            <Text style={styles.reactionEmoji}>❤️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reactionButton} onPress={() => handleSendReaction("🏳️‍🌈")}>
            <Text style={styles.reactionEmoji}>🏳️‍🌈</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reactionButton} onPress={() => handleSendReaction("👏")}>
            <Text style={styles.reactionEmoji}>👏</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reactionButton} onPress={() => handleSendReaction("🔥")}>
            <Text style={styles.reactionEmoji}>🔥</Text>
          </TouchableOpacity>
        </View>

        {/* Host Controls (only show if user is the host) */}
        {user?.id === liveEvent.host_id && (
          <View style={styles.hostControls}>
            <TouchableOpacity
              style={[styles.hostControlButton, isRecording && styles.activeHostControl]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
            >
              <MaterialIcons
                name={isRecording ? "stop" : "fiber-manual-record"}
                size={20}
                color={isRecording ? "white" : "#FF4444"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.hostControlButton, isScreenSharing && styles.activeHostControl]}
              onPress={isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
            >
              <MaterialIcons name="screen-share" size={20} color={isScreenSharing ? "white" : "#4ECDC4"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hostControlButton}
              onPress={() => {
                Alert.alert("Stream Quality", "Select stream quality", [
                  { text: "720p", onPress: () => handleQualityChange("720p") },
                  { text: "1080p", onPress: () => handleQualityChange("1080p") },
                  { text: "4K", onPress: () => handleQualityChange("4K") },
                  { text: "Cancel", style: "cancel" },
                ])
              }}
            >
              <MaterialIcons name="high-quality" size={20} color="#FFA726" />
            </TouchableOpacity>
          </View>
        )}

        {/* Chat Toggle */}
        <TouchableOpacity style={styles.chatToggle} onPress={() => setShowChat(!showChat)}>
          <MaterialIcons name={showChat ? "chat" : "chat-bubble-outline"} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Live Chat */}
      {showChat && (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>Live Chat</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderLiveMessage}
            keyExtractor={(item) => item.id}
            style={styles.chatMessages}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
              value={newMessage}
              onChangeText={setNewMessage}
              placeholderTextColor="#666"
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={[styles.chatSendButton, !newMessage.trim() && styles.chatSendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <MaterialIcons name="send" size={20} color={newMessage.trim() ? "#4ECDC4" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  headerBackButton: {
    padding: 5,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
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
  viewerCount: {
    fontSize: 12,
    color: "white",
    opacity: 0.8,
  },
  headerAction: {
    padding: 5,
    marginLeft: 10,
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 15,
  },
  videoPlaceholderSubtext: {
    fontSize: 16,
    color: "white",
    opacity: 0.8,
    marginTop: 5,
  },
  reactionsContainer: {
    position: "absolute",
    right: 15,
    bottom: 80,
  },
  reactionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  chatToggle: {
    position: "absolute",
    right: 15,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatContainer: {
    height: screenHeight * 0.4,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  chatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  chatContent: {
    flex: 1,
  },
  chatMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  chatUsername: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4ECDC4",
    marginRight: 5,
  },
  chatTime: {
    fontSize: 10,
    color: "#999",
    marginLeft: "auto",
  },
  chatText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 18,
  },
  systemMessage: {
    alignItems: "center",
    paddingVertical: 4,
  },
  systemMessageText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  reactionMessage: {
    alignItems: "center",
    paddingVertical: 2,
  },
  reactionText: {
    fontSize: 20,
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
    maxHeight: 40,
  },
  chatSendButton: {
    marginLeft: 10,
    padding: 8,
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  offlineContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    backgroundColor: "#f5f5f5",
  },
  offlineTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  offlineSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  offlineStats: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  hostControls: {
    position: "absolute",
    left: 15,
    bottom: 80,
    flexDirection: "column",
  },
  hostControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  activeHostControl: {
    backgroundColor: "#FF6B6B",
  },
})
