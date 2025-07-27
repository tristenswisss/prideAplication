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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { messagingService } from "../../services/messagingService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Message, Conversation } from "../../types/messaging"

interface ChatScreenProps {
  navigation: any
  route: {
    params: {
      conversation: Conversation
    }
  }
}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { conversation } = route.params
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const { user } = useAuth()

  useEffect(() => {
    loadMessages()

    // Set up navigation header
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Image source={{ uri: getConversationAvatar() }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{getConversationName()}</Text>
            {!conversation.is_group && conversation.participant_profiles?.[0]?.is_online && (
              <Text style={styles.headerStatus}>Online</Text>
            )}
          </View>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialIcons name="videocam" size={24} color="#4ECDC4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialIcons name="call" size={24} color="#4ECDC4" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <MaterialIcons name="more-vert" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      ),
    })
  }, [])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const data = await messagingService.getMessages(conversation.id)
      setMessages(data)

      // Mark messages as read
      const unreadMessageIds = data.filter((msg) => !msg.read && msg.sender_id !== user?.id).map((msg) => msg.id)
      if (unreadMessageIds.length > 0) {
        await messagingService.markAsRead(conversation.id, unreadMessageIds)
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      Alert.alert("Error", "Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    const messageContent = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const message = await messagingService.sendMessage(conversation.id, user.id, messageContent)
      setMessages((prev) => [...prev, message])

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error("Error sending message:", error)
      Alert.alert("Error", "Failed to send message")
      setNewMessage(messageContent) // Restore message
    } finally {
      setSending(false)
    }
  }

  const getConversationName = (): string => {
    if (conversation.is_group) {
      return conversation.group_name || "Group Chat"
    }
    const otherParticipant = conversation.participant_profiles?.[0]
    return otherParticipant?.name || "Unknown User"
  }

  const getConversationAvatar = (): string => {
    if (conversation.is_group) {
      return conversation.group_avatar || "/placeholder.svg?height=40&width=40&text=GC"
    }
    const otherParticipant = conversation.participant_profiles?.[0]
    return otherParticipant?.avatar_url || "/placeholder.svg?height=40&width=40&text=U"
  }

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id
    const previousMessage = index > 0 ? messages[index - 1] : null
    const showAvatar = !isOwnMessage && (!previousMessage || previousMessage.sender_id !== item.sender_id)
    const showName = conversation.is_group && !isOwnMessage && showAvatar

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
        {showAvatar && (
          <Image
            source={{ uri: item.sender?.avatar_url || "/placeholder.svg?height=30&width=30&text=U" }}
            style={styles.messageAvatar}
          />
        )}

        <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble]}>
          {showName && <Text style={styles.senderName}>{item.sender?.name}</Text>}

          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>{item.content}</Text>

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {formatMessageTime(item.sent_at)}
            </Text>

            {isOwnMessage && (
              <View style={styles.messageStatus}>
                {item.read_at ? (
                  <MaterialIcons name="done-all" size={14} color="#4ECDC4" />
                ) : item.delivered_at ? (
                  <MaterialIcons name="done-all" size={14} color="#ccc" />
                ) : (
                  <MaterialIcons name="done" size={14} color="#ccc" />
                )}
              </View>
            )}
          </View>
        </View>

        {!showAvatar && !isOwnMessage && <View style={styles.avatarSpacer} />}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Image source={{ uri: getConversationAvatar() }} style={styles.emptyAvatar} />
              <Text style={styles.emptyTitle}>Start the conversation!</Text>
              <Text style={styles.emptySubtitle}>Send a message to {getConversationName()}</Text>
            </View>
          }
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <MaterialIcons name="add" size={24} color="#4ECDC4" />
          </TouchableOpacity>

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <MaterialIcons name="send" size={20} color={newMessage.trim() && !sending ? "white" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoid: {
    flex: 1,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  headerStatus: {
    fontSize: 12,
    color: "#4CAF50",
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAction: {
    padding: 8,
    marginLeft: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 2,
    marginHorizontal: 15,
    alignItems: "flex-end",
  },
  ownMessageContainer: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 5,
  },
  avatarSpacer: {
    width: 38,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginVertical: 1,
  },
  ownMessageBubble: {
    backgroundColor: "#FF6B6B",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4ECDC4",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 20,
  },
  ownMessageText: {
    color: "white",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: "#666",
  },
  ownMessageTime: {
    color: "rgba(255,255,255,0.8)",
  },
  messageStatus: {
    marginLeft: 4,
  },
  emptyMessages: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textInputContainer: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#f8f9fa",
  },
  textInput: {
    fontSize: 16,
    color: "#333",
    textAlignVertical: "center",
    minHeight: 24,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
})
