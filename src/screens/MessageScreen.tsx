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
  TextInput,
  Modal,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { messagingService } from "../../services/messagingService"
import { profileService } from "../../services/profileService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Conversation } from "../../types/messaging"
import type { UserProfile } from "../../types"

interface MessagesScreenProps {
  navigation: any
}

export default function MessagesScreen({ navigation }: MessagesScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const loadConversations = async () => {
    if (!user) return

    try {
      setLoading(true)
      const data = await messagingService.getConversations(user.id)
      setConversations(data)
    } catch (error) {
      console.error("Error loading conversations:", error)
      Alert.alert("Error", "Failed to load conversations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const searchUsers = async () => {
    if (!user) return

    try {
      setSearchLoading(true)
      const results = await profileService.searchUsers(searchQuery, user.id)
      if (results.success && results.data) {
        setSearchResults(results.data)
      }
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleStartConversation = async (targetUser: UserProfile) => {
    if (!user) return

    try {
      // Check if conversation already exists
      const existingConversation = conversations.find(
        (conv) => conv.participants.includes(targetUser.id) && !conv.is_group,
      )

      if (existingConversation) {
        navigation.navigate("Chat", { conversation: existingConversation })
      } else {
        const newConversation = await messagingService.createConversation([targetUser.id])
        setConversations([newConversation, ...conversations])
        navigation.navigate("Chat", { conversation: newConversation })
      }

      setShowNewMessage(false)
      setSearchQuery("")
    } catch (error) {
      console.error("Error starting conversation:", error)
      Alert.alert("Error", "Failed to start conversation")
    }
  }

  const formatLastMessageTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d`
    return date.toLocaleDateString()
  }

  const getConversationName = (conversation: Conversation): string => {
    if (conversation.is_group) {
      return conversation.group_name || "Group Chat"
    }
    const otherParticipant = conversation.participant_profiles?.[0]
    return otherParticipant?.name || "Unknown User"
  }

  const getConversationAvatar = (conversation: Conversation): string => {
    if (conversation.is_group) {
      return conversation.group_avatar || "/placeholder.svg?height=50&width=50&text=GC"
    }
    const otherParticipant = conversation.participant_profiles?.[0]
    return otherParticipant?.avatar_url || "/placeholder.svg?height=50&width=50&text=U"
  }

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigation.navigate("Chat", { conversation: item })}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: getConversationAvatar(item) }} style={styles.avatar} />
        {!item.is_group && item.participant_profiles?.[0]?.is_online && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {getConversationName(item)}
          </Text>
          {item.last_message && (
            <Text style={styles.messageTime}>{formatLastMessageTime(item.last_message.sent_at)}</Text>
          )}
        </View>

        <View style={styles.lastMessageContainer}>
          <Text style={[styles.lastMessage, item.unread_count > 0 && styles.unreadMessage]} numberOfLines={1}>
            {item.last_message?.sender_id === user?.id ? "You: " : ""}
            {item.last_message?.content || "No messages yet"}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread_count > 99 ? "99+" : item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderSearchResult = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.searchResultItem} onPress={() => handleStartConversation(item)}>
      <Image
        source={{ uri: item.avatar_url || "/placeholder.svg?height=50&width=50&text=" + item.name.charAt(0) }}
        style={styles.searchAvatar}
      />
      <View style={styles.searchUserInfo}>
        <View style={styles.searchUserHeader}>
          <Text style={styles.searchUserName}>{item.name}</Text>
          {item.verified && <MaterialIcons name="verified" size={16} color="#4CAF50" />}
        </View>
        <Text style={styles.searchUserHandle}>@{item.username || item.name.toLowerCase().replace(/\s+/g, "")}</Text>
        {item.bio && (
          <Text style={styles.searchUserBio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      <View style={[styles.onlineStatus, item.is_online && styles.onlineStatusActive]} />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity onPress={() => setShowNewMessage(true)} style={styles.newMessageButton}>
            <MaterialIcons name="edit" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        style={styles.conversationsList}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          loadConversations()
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="chat-bubble-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtitle}>Start a conversation with someone from the community!</Text>
            <TouchableOpacity style={styles.startChatButton} onPress={() => setShowNewMessage(true)}>
              <Text style={styles.startChatButtonText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* New Message Modal */}
      <Modal visible={showNewMessage} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewMessage(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Message</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <MaterialIcons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for people..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#666"
                autoFocus
              />
            </View>
          </View>

          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.searchResults}
            ListEmptyComponent={
              searchQuery.trim() ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>{searchLoading ? "Searching..." : "No users found"}</Text>
                </View>
              ) : (
                <View style={styles.searchPrompt}>
                  <MaterialIcons name="people" size={48} color="#ccc" />
                  <Text style={styles.searchPromptText}>Search for community members to start a conversation</Text>
                </View>
              )
            }
          />
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "white",
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
  },
  lastMessageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  unreadMessage: {
    color: "#333",
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    color: "white",
    fontWeight: "bold",
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
    marginBottom: 30,
  },
  startChatButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startChatButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalCancel: {
    fontSize: 16,
    color: "#666",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  searchUserInfo: {
    flex: 1,
  },
  searchUserHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  searchUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 5,
  },
  searchUserHandle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  searchUserBio: {
    fontSize: 12,
    color: "#999",
  },
  onlineStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ccc",
  },
  onlineStatusActive: {
    backgroundColor: "#4CAF50",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
  },
  searchPrompt: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  searchPromptText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 15,
    lineHeight: 22,
  },
})
