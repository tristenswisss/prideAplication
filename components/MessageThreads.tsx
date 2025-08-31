"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput, SafeAreaView, Image } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import type { Message } from "../types/messaging"
import { useTheme } from "../Contexts/ThemeContext"

interface ThreadMessage extends Message {
  parent_id: string
}

interface MessageThreadsProps {
  parentMessage: Message
  visible: boolean
  onClose: () => void
  onSendReply: (content: string) => void
}

export default function MessageThreads({ parentMessage, visible, onClose, onSendReply }: MessageThreadsProps) {
  const { theme } = useTheme()
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([])
  const [replyText, setReplyText] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadThreadMessages()
    }
  }, [visible])

  const loadThreadMessages = async () => {
    setLoading(true)
    // Mock thread messages
    const mockThreadMessages: ThreadMessage[] = [
      {
        id: "thread1",
        conversation_id: parentMessage.conversation_id,
        sender_id: "user2",
        sender: {
          id: "user2",
          name: "Jordan Pride",
          avatar_url: "/placeholder.svg?height=30&width=30&text=JP",
        } as any,
        content: "That sounds great! What time works for you?",
        message_type: "text",
        read: true,
        sent_at: new Date(Date.now() - 300000).toISOString(),
        parent_id: parentMessage.id,
        created_at: new Date(Date.now() - 300000).toISOString(),
        updated_at: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: "thread2",
        conversation_id: parentMessage.conversation_id,
        sender_id: "user1",
        sender: {
          id: "user1",
          name: "Alex Rainbow",
          avatar_url: "/placeholder.svg?height=30&width=30&text=AR",
        } as any,
        content: "How about 3 PM? I'll be free then.",
        message_type: "text",
        read: true,
        sent_at: new Date(Date.now() - 180000).toISOString(),
        parent_id: parentMessage.id,
        created_at: new Date(Date.now() - 180000).toISOString(),
        updated_at: new Date(Date.now() - 180000).toISOString(),
      },
    ]

    setThreadMessages(mockThreadMessages)
    setLoading(false)
  }

  const handleSendReply = () => {
    if (!replyText.trim()) return

    onSendReply(replyText)
    setReplyText("")

    // Add to local thread messages
    const newReply: ThreadMessage = {
      id: Math.random().toString(36).substr(2, 9),
      conversation_id: parentMessage.conversation_id,
      sender_id: "current_user",
      content: replyText,
      message_type: "text",
      read: true,
      sent_at: new Date().toISOString(),
      parent_id: parentMessage.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setThreadMessages([...threadMessages, newReply])
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderThreadMessage = ({ item }: { item: ThreadMessage }) => (
    <View style={styles.threadMessage}>
      <Image
        source={{ uri: item.sender?.avatar_url || "/placeholder.svg?height=30&width=30&text=U" }}
        style={styles.threadAvatar}
      />
      <View style={styles.threadMessageContent}>
        <View style={styles.threadMessageHeader}>
          <Text style={[styles.threadSenderName, { color: theme.colors.transFriendly }]}>{item.sender?.name || "Unknown"}</Text>
          <Text style={[styles.threadMessageTime, { color: theme.colors.textTertiary }]}>{formatTime(item.sent_at)}</Text>
        </View>
        <Text style={[styles.threadMessageText, { color: theme.colors.text }]}>{item.content}</Text>
      </View>
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={[styles.container, { height: '75%' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Thread</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Original Message */}
          <View style={[styles.originalMessage, { backgroundColor: theme.colors.surface }]}>
            <Image
              source={{ uri: parentMessage.sender?.avatar_url || "/placeholder.svg?height=40&width=40&text=U" }}
              style={styles.originalAvatar}
            />
            <View style={styles.originalMessageContent}>
              <View style={styles.originalMessageHeader}>
                <Text style={[styles.originalSenderName, { color: theme.colors.text }]}>{parentMessage.sender?.name || "Unknown"}</Text>
                <Text style={[styles.originalMessageTime, { color: theme.colors.textSecondary }]}>{formatTime(parentMessage.sent_at)}</Text>
              </View>
              <Text style={[styles.originalMessageText, { color: theme.colors.text }]}>{parentMessage.content}</Text>
            </View>
          </View>

          <View style={[styles.threadDivider, { backgroundColor: theme.colors.border }]} />

          {/* Thread Messages */}
          <FlatList
            data={threadMessages}
            renderItem={renderThreadMessage}
            keyExtractor={(item) => item.id}
            style={styles.threadList}
            contentContainerStyle={styles.threadListContent}
          />

          {/* Reply Input */}
          <View style={[styles.replyContainer, { borderTopColor: theme.colors.border }]}>
            <TextInput
              style={[styles.replyInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
              placeholder="Reply to thread..."
              placeholderTextColor={theme.colors.placeholder}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendReply}
              disabled={!replyText.trim()}
            >
              <MaterialIcons name="send" size={20} color={replyText.trim() ? theme.colors.transFriendly : theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerSpacer: {
    width: 34,
  },
  originalMessage: {
    flexDirection: "row",
    padding: 20,
  },
  originalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  originalMessageContent: {
    flex: 1,
  },
  originalMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  originalSenderName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  originalMessageTime: {
    fontSize: 12,
  },
  originalMessageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  threadDivider: {
    height: 1,
    marginHorizontal: 20,
  },
  threadList: {
    flex: 1,
  },
  threadListContent: {
    padding: 20,
  },
  threadMessage: {
    flexDirection: "row",
    marginBottom: 15,
  },
  threadAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  threadMessageContent: {
    flex: 1,
  },
  threadMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  threadSenderName: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  threadMessageTime: {
    fontSize: 11,
  },
  threadMessageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: 10,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
})
