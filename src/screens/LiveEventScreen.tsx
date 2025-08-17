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
import { realtime } from "../../lib/realtime"
import { WebView } from "react-native-webview"

// Import the type for StackScreenProps
import type { StackScreenProps } from "@react-navigation/stack"
import type { EventsStackParamList } from "../../types/navigation"

// Define the props type using the navigation type
type LiveEventScreenProps = StackScreenProps<EventsStackParamList, "LiveEvent">

const { height: screenHeight } = Dimensions.get("window")

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
  const [jitsiUrl, setJitsiUrl] = useState<string | null>(null)
  const [modeChosen, setModeChosen] = useState<"create" | "join" | null>(null)

  useEffect(() => {
    // Ask the user whether to create or join when arriving to a live event view
    Alert.alert(
      "Live Event",
      "Do you want to create or join?",
      [
        {
          text: "Join",
          onPress: async () => {
            setModeChosen("join")
            await viewerJoinLive()
          },
        },
        {
          text: "Create",
          onPress: async () => {
            setModeChosen("create")
            if (user?.id === liveEvent.host_id) {
              await hostStartLive()
            } else {
              // Non-host cannot create, fallback to join
              await viewerJoinLive()
            }
          },
        },
        { text: "Cancel", style: "cancel", onPress: () => navigation.goBack() },
      ],
      { cancelable: true },
    )
  }, [])

  useEffect(() => {
    if (!liveEvent?.id) return
    const unsubMsgs = realtime.subscribeToLiveMessages(liveEvent.id, (row: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev
        return [...prev, row as any]
      })
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 50)
    })

    const unsubEvt = realtime.subscribeToLiveEventUpdates(liveEvent.id, (row: any) => {
      setLiveEvent((prev) => ({ ...(prev || row), ...row }))
    })

    return () => {
      unsubMsgs()
      unsubEvt()
    }
  }, [liveEvent?.id])

  const hostStartLive = async () => {
    if (!user) return
    try {
      await liveEventService.startLiveStream(liveEvent.id)
      // Use a predictable Jitsi room for the event
      setJitsiUrl(`https://meet.jit.si/live_${liveEvent.id}`)
      await joinStream()
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not start live event")
    }
  }

  const viewerJoinLive = async () => {
    if (!user) return
    try {
      // use the same Jitsi room; host will toggle is_live
      setJitsiUrl(`https://meet.jit.si/live_${liveEvent.id}`)
      await joinStream()
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not join live event")
    }
  }

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
            <MaterialIcons name="verified" size={12} color="#4CAF50" />
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{liveEvent.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stream Area */}
      <View style={styles.streamContainer}>
        {jitsiUrl ? (
          <WebView
            source={{ uri: `${jitsiUrl}#config.disableDeepLinking=true&config.prejoinPageEnabled=false` }}
            style={{ flex: 1 }}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            startInLoadingState
            onHttpError={() => {}}
            onError={() => {}}
          />
        ) : (
          <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.streamPlaceholder}>
            <MaterialIcons name="live-tv" size={64} color="white" />
            <Text style={styles.streamPlaceholderText}>{liveEvent.is_live ? "Live" : "Offline"}</Text>
          </LinearGradient>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.leftControls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setShowChat(!showChat)}>
            <MaterialIcons name="chat" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => setStreamQuality("1080p")}>
            <MaterialIcons name="high-quality" size={20} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.rightControls}>
          {user?.id === liveEvent.host_id ? (
            <TouchableOpacity style={[styles.goLiveButton, liveEvent.is_live && styles.endLiveButton]} onPress={hostStartLive}>
              <Text style={styles.goLiveText}>{liveEvent.is_live ? "Go Live Again" : "Go Live (Jitsi)"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.goLiveButton]} onPress={viewerJoinLive}>
              <Text style={styles.goLiveText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
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
  streamContainer: {
    flex: 1,
    position: "relative",
  },
  streamPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  streamPlaceholderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 15,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  leftControls: {
    flexDirection: "row",
  },
  controlButton: {
    marginRight: 15,
  },
  rightControls: {
    //
  },
  goLiveButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  endLiveButton: {
    backgroundColor: "#FF4444",
  },
  goLiveText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})
