"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, Image, TextInput, KeyboardAvoidingView, Platform } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { Linking } from "react-native"
import { messagingService } from "../../services/messagingService"
import { imageUploadService } from "../../services/imageUploadService"
import { fileUploadService } from "../../services/fileUploadService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Message, Conversation } from "../../types/messaging"
import MessageReactions from "../../components/MessageReactions"
import MessageThreads from "../../components/MessageThreads"
import AppModal from "../../components/AppModal"
import { realtime } from "../../lib/realtime"
import VoiceCallWebView from "../../components/VoiceCallWebView"

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name?: string; mimeType?: string } | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [showThreads, setShowThreads] = useState(false)
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<Message | null>(null)
  const [messageReactions, setMessageReactions] = useState<{ [messageId: string]: any[] }>({})
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([])
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [showVoiceCall, setShowVoiceCall] = useState(false)
  const [modal, setModal] = useState<
    | { type: "none" }
    | { type: "info"; title: string; message: string }
    | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  >({ type: "none" })

  useEffect(() => {
    loadMessages()

    // Set up navigation header
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (!conversation.is_group) {
              const other = conversation.participant_profiles?.find((p) => p.id !== user?.id)
              if (other?.id) navigation.navigate("UserProfile", { userId: other.id })
            }
          }}
        >
          <View style={styles.headerTitle}>
            <Image source={{ uri: getConversationAvatar() }} style={styles.headerAvatar} />
            <View>
              <Text style={styles.headerName}>{getConversationName()}</Text>
              {!conversation.is_group && conversation.participant_profiles?.[0]?.is_online && (
                <Text style={styles.headerStatus}>Online</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
      headerRight: () => renderHeaderActions(),
    })
  }, [])

  useEffect(() => {
    // Update header actions when selection changes
    navigation.setOptions({
      headerRight: () => renderHeaderActions(),
    })
  }, [selectedMessageIds])

  useEffect(() => {
    if (!conversation?.id) return
    const unsubscribe = realtime.subscribeToMessages(conversation.id, (row: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev
        return [...prev, row as any]
      })
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })
    return () => unsubscribe()
  }, [conversation?.id])

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
      setModal({ type: "info", title: "Error", message: "Failed to load messages" })
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage && !selectedFile) || !user || sending) return

    setSending(true)

    try {
      let messageContent = newMessage.trim()
      let messageType: "text" | "image" | "file" = "text"
      let metadata: any = undefined

      // If we have an image, upload it and send as image message
      if (selectedImage) {
        const result = await imageUploadService.uploadImage(selectedImage, user.id, "messages")
        if (!result.success || !result.url) {
          throw new Error(result.error || "Image upload failed")
        }
        messageType = "image"
        metadata = { image_url: result.url }
        messageContent = "Image"
      }

      // If we have a file, upload and send as file message
      if (selectedFile && !selectedImage) {
        const result = await fileUploadService.uploadFile(
          selectedFile.uri,
          user.id,
          selectedFile.name,
          selectedFile.mimeType,
        )
        if (!result.success || !result.url) {
          throw new Error(result.error || "File upload failed")
        }
        messageType = "file"
        metadata = { file_url: result.url, file_name: result.name, mime_type: result.mimeType }
        messageContent = result.name || "File"
      }

      const message = await messagingService.sendMessage(
        conversation.id,
        user.id,
        messageContent,
        messageType,
        metadata,
      )
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)

      // Clear inputs
      setNewMessage("")
      setSelectedImage(null)
      setSelectedFile(null)
      setShowEmojiPicker(false)
    } catch (error) {
      console.error("Error sending message:", error)
      setModal({ type: "info", title: "Error", message: "Failed to send message" })
    } finally {
      setSending(false)
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    // In a real app, this would call an API
    const currentReactions = messageReactions[messageId] || []
    const existingReaction = currentReactions.find((r) => r.emoji === emoji)

    if (existingReaction) {
      existingReaction.count += 1
      existingReaction.hasReacted = true
    } else {
      currentReactions.push({
        emoji,
        count: 1,
        users: [user?.id],
        hasReacted: true,
      })
    }

    setMessageReactions({
      ...messageReactions,
      [messageId]: currentReactions,
    })
  }

  const isMessageSelected = (messageId: string): boolean => selectedMessageIds.includes(messageId)

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    )
  }

  const clearSelection = () => setSelectedMessageIds([])

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return
    setModal({
      type: "confirm",
      title: "Delete messages",
      message: `Delete ${selectedMessageIds.length} selected message(s)?`,
      onConfirm: async () => {
        const ok = await messagingService.deleteMessages(conversation.id, selectedMessageIds)
        if (ok) {
          setMessages((prev) => prev.filter((m) => !selectedMessageIds.includes(m.id)))
          setSelectedMessageIds([])
        } else {
          setModal({ type: "info", title: "Error", message: "Failed to delete messages" })
        }
      },
    })
  }

  const handleMoreActions = () => {
    setModal({
      type: "confirm",
      title: "Conversation options",
      message: "Delete conversation?",
      onConfirm: async () => {
        const ok = await messagingService.deleteConversation(conversation.id)
        if (ok) {
          navigation.goBack()
        } else {
          setModal({ type: "info", title: "Error", message: "Failed to delete conversation" })
        }
      },
    })
  }

  const renderHeaderActions = () => {
    const selectionActive = selectedMessageIds.length > 0
    if (selectionActive) {
      return (
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={clearSelection}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleDeleteSelectedMessages}>
            <MaterialIcons name="delete" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )
    }
    return (
      <View style={styles.headerActions}>
        {/* Open meeting options (Zoom/Meet) via attach modal */}
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowVoiceCall(true)}>
          <MaterialIcons name="call" size={24} color="#4ECDC4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={() => setShowAttachModal(true)}>
          <MaterialIcons name="video-call" size={24} color="#4ECDC4" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction} onPress={handleMoreActions}>
          <MaterialIcons name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    )
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    const currentReactions = messageReactions[messageId] || []
    const reactionIndex = currentReactions.findIndex((r) => r.emoji === emoji)

    if (reactionIndex !== -1) {
      const reaction = currentReactions[reactionIndex]
      if (reaction.count > 1) {
        reaction.count -= 1
        reaction.hasReacted = false
      } else {
        currentReactions.splice(reactionIndex, 1)
      }
    }

    setMessageReactions({
      ...messageReactions,
      [messageId]: currentReactions,
    })
  }

  const handleStartCall = async (_type: "voice" | "video") => {
    // Deprecated: open meeting options instead
    setShowAttachModal(true)
  }

  const handleOpenThread = (message: Message) => {
    setSelectedThreadMessage(message)
    setShowThreads(true)
  }

  const handlePickImage = async () => {
    try {
      const image = await imageUploadService.pickImage()
      if (image && !image.canceled && image.assets && image.assets[0]?.uri) {
        setSelectedImage(image.assets[0].uri)
        setSelectedFile(null)
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const handleTakePhoto = async () => {
    try {
      const image = await imageUploadService.takePhoto()
      if (image && !image.canceled && image.assets && image.assets[0]?.uri) {
        setSelectedImage(image.assets[0].uri)
        setSelectedFile(null)
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo")
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
  }
  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const handlePickDocument = async () => {
    try {
      const doc = await fileUploadService.pickDocument(["*/*"])
      if (doc && !doc.canceled && doc.uri) {
        setSelectedFile({ uri: doc.uri, name: doc.name, mimeType: doc.mimeType })
        setSelectedImage(null)
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document")
    }
  }

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev)
  }

  const handleSelectEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
  }

  const handleSendThreadReply = async (content: string) => {
    if (!selectedThreadMessage || !user) return

    // In a real app, this would send a threaded reply
    console.log("Sending thread reply:", content)
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

  const renderAttachmentPreview = () => {
    if (selectedImage) {
      return (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
            <MaterialIcons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )
    }
    if (selectedFile) {
      return (
        <View style={styles.filePreviewContainer}>
          <MaterialIcons name="attach-file" size={18} color="#666" />
          <Text style={styles.filePreviewName} numberOfLines={1}>{selectedFile.name || "Selected file"}</Text>
          <TouchableOpacity style={styles.removeFileButton} onPress={handleRemoveFile}>
            <MaterialIcons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )
    }
    return null
  }

  const EMOJIS = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤩","🤗","👍","👏","🙏","🔥","💯","🎉","🌈","✨"]

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id
    const previousMessage = index > 0 ? messages[index - 1] : null
    const showAvatar = !isOwnMessage && (!previousMessage || previousMessage.sender_id !== item.sender_id)
    const showName = conversation.is_group && !isOwnMessage && showAvatar
    const reactions = messageReactions[item.id] || []

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => toggleSelectMessage(item.id)}
        onPress={() => {
          if (selectedMessageIds.length > 0) toggleSelectMessage(item.id)
        }}
        style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer, isMessageSelected(item.id) && styles.selectedMessageContainer]}
      >
        {showAvatar && (
          <Image
            source={{ uri: item.sender?.avatar_url || "/placeholder.svg?height=30&width=30&text=U" }}
            style={styles.messageAvatar}
          />
        )}

        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          isMessageSelected(item.id) && styles.selectedMessageBubble,
        ]}>
          {showName && <Text style={styles.senderName}>{item.sender?.name}</Text>}
          {item.message_type === "image" && item.metadata?.image_url ? (
            <Image source={{ uri: item.metadata.image_url }} style={styles.inlineImage} />
          ) : item.message_type === "file" && item.metadata?.file_url ? (
            <TouchableOpacity
              onPress={() => {
                const url = item.metadata?.file_url
                if (url) {
                  Linking.openURL(url).catch(() => {})
                }
              }}
              style={styles.fileAttachment}
            >
              <MaterialIcons name="attach-file" size={16} color={isOwnMessage ? "#fff" : "#333"} />
              <Text style={[styles.fileAttachmentText, isOwnMessage && styles.ownMessageText]} numberOfLines={1}>
                {item.metadata?.file_name ?? "Attachment"}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>{item.content}</Text>
          )}

          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {formatMessageTime(item.sent_at)}
            </Text>

            {isOwnMessage && (
              <View style={styles.messageStatus}>
                {item.read ? (
                  <MaterialIcons name="done-all" size={14} color="#4ECDC4" />
                ) : (
                  <MaterialIcons name="done" size={14} color="#ccc" />
                )}
              </View>
            )}
          </View>

          {/* Message Reactions */}
          <MessageReactions
            messageId={item.id}
            reactions={reactions}
            onAddReaction={(emoji) => handleAddReaction(item.id, emoji)}
            onRemoveReaction={(emoji) => handleRemoveReaction(item.id, emoji)}
          />

          {/* Thread Button */}
          <TouchableOpacity style={styles.threadButton} onPress={() => handleOpenThread(item)}>
            <MaterialIcons name="forum" size={14} color="#666" />
            <Text style={styles.threadButtonText}>Reply in thread</Text>
          </TouchableOpacity>
        </View>

        {!showAvatar && !isOwnMessage && <View style={styles.avatarSpacer} />}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppModal
        visible={modal.type !== "none"}
        onClose={() => {
          const current = modal
          setModal({ type: "none" })
          if (current.type === "confirm" && current.onConfirm) current.onConfirm()
        }}
        title={modal.type === "none" ? undefined : modal.title}
        variant="center"
        rightAction={{
          label: modal.type === "confirm" ? "OK" : "Close",
          onPress: () => {
            const current = modal
            setModal({ type: "none" })
            if (current.type === "confirm" && current.onConfirm) current.onConfirm()
          },
        }}
      >
        {modal.type !== "none" && <Text style={{ fontSize: 16, color: "#333" }}>{modal.message}</Text>}
      </AppModal>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Image source={{ uri: getConversationAvatar() }} style={styles.emptyAvatar} />
              <Text style={styles.emptyTitle}>Start the conversation!</Text>
              <Text style={styles.emptySubtitle}>Send a message to {getConversationName()}</Text>
            </View>
          }
        />

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <View style={styles.emojiPicker}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} style={styles.emojiButton} onPress={() => handleSelectEmoji(e)}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Message Input - full width with + to open modal */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.plusButton} onPress={() => setShowAttachModal(true)}>
            <MaterialIcons name="add" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.textInputContainer}>
            {selectedImage || selectedFile ? (
              renderAttachmentPreview()
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={1000}
                placeholderTextColor="#666"
              />
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              ((!newMessage.trim() && !selectedImage && !selectedFile) || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedImage && !selectedFile) || sending}
          >
            <MaterialIcons
              name="send"
              size={20}
              color={(newMessage.trim() || selectedImage || selectedFile) && !sending ? "white" : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Message Threads Modal */}
      {selectedThreadMessage && (
        <MessageThreads
          parentMessage={selectedThreadMessage}
          visible={showThreads}
          onClose={() => setShowThreads(false)}
          onSendReply={handleSendThreadReply}
        />
      )}

      {/* Attachments Modal */}
      <AppModal
        visible={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        title="Add to message"
        leftAction={{ label: "Close", onPress: () => setShowAttachModal(false) }}
        variant="center"
      >
        <View style={{ flexDirection: "column" }}>
          <TouchableOpacity style={styles.optionRow} onPress={() => { setShowAttachModal(false); toggleEmojiPicker() }}>
            <MaterialIcons name="emoji-emotions" size={24} color="#4ECDC4" />
            <Text style={styles.optionText}>Emoji</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => { setShowAttachModal(false); handlePickImage() }}>
            <MaterialIcons name="image" size={24} color="#4ECDC4" />
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => { setShowAttachModal(false); handleTakePhoto() }}>
            <MaterialIcons name="photo-camera" size={24} color="#4ECDC4" />
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => { setShowAttachModal(false); handlePickDocument() }}>
            <MaterialIcons name="attach-file" size={24} color="#4ECDC4" />
            <Text style={styles.optionText}>Document</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => { setShowAttachModal(false); Linking.openURL('https://meet.google.com') }}>
            <MaterialIcons name="video-call" size={24} color="#4ECDC4" />
            <Text style={styles.optionText}>Open Google Meet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionRow} onPress={() => { setShowAttachModal(false); Linking.openURL('https://zoom.us') }}>
            <MaterialIcons name="videocam" size={24} color="#4ECDC4" />
            <Text style={styles.optionText}>Open Zoom</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Voice Call Modal (WebView Peer P2P) */}
      {showVoiceCall && (
        <Modal visible animationType="slide" presentationStyle="fullScreen">
          <VoiceCallWebView
            roomId={`conv_${conversation.id}`}
            isHost={(user?.id || "") < (conversation.participant_profiles?.[0]?.id || "z")}
            onClose={() => setShowVoiceCall(false)}
          />
        </Modal>
      )}
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
  selectedMessageContainer: {
    opacity: 0.9,
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
  selectedMessageBubble: {
    borderWidth: 1,
    borderColor: "#4ECDC4",
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
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
  imagePreviewContainer: {
    position: "relative",
    width: 80,
    height: 80,
    marginRight: 10,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF6B6B",
    borderRadius: 15,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
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
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  threadButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    paddingVertical: 2,
  },
  threadButtonText: {
    fontSize: 11,
    color: "#666",
    marginLeft: 4,
  },
  inlineImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginVertical: 4,
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fileAttachmentText: {
    maxWidth: 220,
    color: "#333",
  },
  filePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  filePreviewName: {
    flex: 1,
    color: "#333",
  },
  removeFileButton: {
    marginLeft: 8,
    backgroundColor: "#999",
    borderRadius: 10,
    padding: 2,
  },
  emojiPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 22,
  },
})
