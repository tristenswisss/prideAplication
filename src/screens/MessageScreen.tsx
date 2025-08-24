"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, Image, TextInput, Alert } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { messagingService } from "../../services/messagingService"
import { events } from "../../lib/events"
import { realtime } from "../../lib/realtime"
import { profileService } from "../../services/profileService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Conversation } from "../../types/messaging"
import type { UserProfile } from "../../types"
import AppModal from "../../components/AppModal"
import { storage } from "../../lib/storage"

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
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  const { user } = useAuth()
  const [modal, setModal] = useState<
    | { type: "none" }
    | { type: "info"; title: string; message: string }
    | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  >({ type: "none" })

  useEffect(() => {
    loadConversations()
  }, [])

  // Refresh when screen regains focus to reflect read status changes
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadConversations()
    })
    return unsubscribe
  }, [navigation])

  // Realtime: new messages update conversations list and unread counts
  useEffect(() => {
    if (!user?.id || conversations.length === 0) return
    const unsubscribers = conversations.map((c) =>
      realtime.subscribeToMessageUpdates(c.id, {
        onInsert: async (row: any) => {
          setConversations((prev) => {
            const next = prev.map((conv) =>
              conv.id === c.id ? { ...conv, last_message: row, updated_at: row.sent_at } : conv,
            )
            return next.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          })
          try { await storage.setItem(`last_msg_${c.id}`, row) } catch {}
          if (row.sender_id !== user.id) {
            const count = await messagingService.getUnreadCount(c.id, user.id)
            setConversations((prev) => prev.map((conv) => (conv.id === c.id ? { ...conv, unread_count: count } : conv)))
          }
        },
        onUpdate: async (row: any) => {
          // When reads happen, refresh unread count for that conversation
          const count = await messagingService.getUnreadCount(c.id, user.id)
          setConversations((prev) => prev.map((conv) => (conv.id === c.id ? { ...conv, unread_count: count } : conv)))
          events.emit("unreadCountsChanged", undefined as any)
        },
      }),
    )
    return () => {
      unsubscribers.forEach((u) => u())
    }
  }, [conversations, user?.id])

  // Realtime: subscribe to presence for other participants and update online dots/last seen
  useEffect(() => {
    if (!user?.id || conversations.length === 0) return
    const otherIds = Array.from(
      new Set(
        conversations
          .filter((c) => !c.is_group)
          .map((c) => c.participant_profiles?.find((p) => p.id !== user.id)?.id)
          .filter(Boolean) as string[],
      ),
    )
    if (otherIds.length === 0) return

    const unsubscribers = otherIds.map((oid) =>
      realtime.subscribeToUserStatus(oid, (row: any) => {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.is_group) return conv
            const other = conv.participant_profiles?.find((p) => p.id !== user.id)
            if (other?.id !== row.user_id) return conv
            const updatedProfiles = (conv.participant_profiles || []).map((p) =>
              p.id === row.user_id ? { ...p, is_online: !!row.is_online, last_seen: row.last_seen } : p,
            )
            return { ...conv, participant_profiles: updatedProfiles as any }
          }),
        )
      }),
    )

    return () => {
      unsubscribers.forEach((u) => u())
    }
  }, [conversations])

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!user || !searchQuery.trim()) {
        setSearchResults([])
        return
      }
      try {
        setSearchLoading(true)
        const result = await profileService.searchUsers(searchQuery.trim(), user.id)
        setSearchResults(result.success && result.data ? result.data : [])
      } catch (error) {
        console.error("Error searching users:", error)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, user])

  // Refresh conversations when unread counts change elsewhere (e.g., leaving a chat)
  useEffect(() => {
    const off = events.on("unreadCountsChanged", () => {
      loadConversations()
    })
    const offClosed = events.on("conversationClosed", ({ conversationId }) => {
      // Optimistically zero this conversation's unread count in the local list
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)))
    })
    const offOpened = events.on("conversationOpened", ({ conversationId }) => {
      // Also zero immediately on open for snappier UI
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)))
    })
    return () => {
      off()
      offClosed()
      offOpened()
    }
  }, [user?.id])

  const loadConversations = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Hydrate from cached last messages if available (non-blocking network refresh)
      try {
        const ids = await messagingService.getConversationIds(user.id)
        const convs = await messagingService.getConversations(user.id)
        const byId = new Map<string, Conversation>()
        for (const c of convs) byId.set(c.id, c)
        // Attach cached last message to conversations if present
        const withCachedLast = await Promise.all(
          Array.from(byId.values()).map(async (c) => {
            const cached = await storage.getItem<any>(`last_msg_${c.id}`)
            if (cached) {
              return { ...c, last_message: { ...(c.last_message || {}), ...cached } } as Conversation
            }
            return c
          }),
        )
        setConversations(withCachedLast)
      } catch {}

      const data = await messagingService.getConversations(user.id)
      // Ensure no duplicate conversations with the same id or same 1:1 participant
      const byId = new Map<string, Conversation>()
      const seenPairs = new Set<string>()
      for (const conv of data) {
        if (!conv) continue
        if (byId.has(conv.id)) continue
        if (!conv.is_group) {
          const otherId = conv.participant_profiles?.find((p) => p.id !== user.id)?.id
          const key = otherId ? [user.id, otherId].sort().join(":") : undefined
          if (key) {
            if (seenPairs.has(key)) continue
            seenPairs.add(key)
          }
        }
        byId.set(conv.id, conv)
      }
      const list = Array.from(byId.values())
      // Fetch initial unread counts for each conversation
      const counts = await messagingService.getConversationUnreadCounts(
        list.map((c) => c.id),
        user.id,
      )
      const withCounts = list.map((c) => ({ ...c, unread_count: counts[c.id] ?? c.unread_count ?? 0 }))

      // Persist last messages for cache
      try {
        await Promise.all(
          withCounts.map(async (c) => {
            if (c.last_message) {
              await storage.setItem(`last_msg_${c.id}`, c.last_message)
            }
          }),
        )
      } catch {}

      setConversations(withCounts)
    } catch (error) {
      console.error("Error loading conversations:", error)
      Alert.alert("Error", "Failed to load conversations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleStartConversation = async (targetUser: UserProfile) => {
    if (!user) return

    try {
      // Check if conversation already exists (prefer participant_profiles if present)
      const existingConversation = conversations.find((conv) => {
        if (conv.is_group) return false
        const otherIdFromProfiles = conv.participant_profiles?.find((p) => p.id !== user.id)?.id
        if (otherIdFromProfiles) {
          return otherIdFromProfiles === targetUser.id
        }
        return Array.isArray(conv.participants) && conv.participants.some((id: any) => id === targetUser.id)
      })

      if (existingConversation) {
        navigation.navigate("Chat", { conversation: existingConversation })
      } else {
        const newConversation = await messagingService.getOrCreateDirectConversation(user.id, targetUser.id)
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
    const otherProfile = conversation.participant_profiles?.find((p) => p.id !== user?.id)
    return otherProfile?.name || "Unknown User"
  }

  const getConversationAvatar = (conversation: Conversation): string => {
    if (conversation.is_group) {
      return conversation.group_avatar || "/placeholder.svg?height=50&width=50&text=GC"
    }
    const otherProfile = conversation.participant_profiles?.find((p) => p.id !== user?.id)
    return otherProfile?.avatar_url || "/placeholder.svg?height=50&width=50&text=U"
  }

  const formatLastSeen = (iso?: string): string => {
    if (!iso) return ""
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    return `${diffDay}d ago`
  }

  const handleDeleteConversation = async (conversationId: string) => {
    const ok = await messagingService.deleteConversation(conversationId)
    if (ok) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
    } else {
      setModal({ type: "info", title: "Error", message: "Failed to delete conversation" })
    }
  }

  const openConversationMenu = (item: Conversation) => {
    setModal({
      type: "confirm",
      title: getConversationName(item),
      message: "Delete conversation?",
      onConfirm: () => handleDeleteConversation(item.id),
    })
  }

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => {
        const currentUnread = item.unread_count || 0
        setConversations((prev) => prev.map((c) => (c.id === item.id ? { ...c, unread_count: 0 } : c)))

        events.emit("conversationOpened", { conversationId: item.id, previousUnreadCount: currentUnread })
        navigation.navigate("Chat", { conversation: item })
      }}
      onLongPress={() => openConversationMenu(item)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: getConversationAvatar(item) }} style={styles.avatar} />
        {!item.is_group && item.participant_profiles?.find((p) => p.id !== user?.id)?.is_online && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {getConversationName(item)}
          </Text>
          {(() => {
            const other = item.participant_profiles?.find((p) => p.id !== user?.id)
            if (other?.is_online) {
              return <Text style={[styles.messageTime, { color: "#4CAF50" }]}>Online</Text>
            }
            const lastSeen = (other as any)?.last_seen || other?.updated_at
            return <Text style={styles.messageTime}>{lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : ""}</Text>
          })()}
        </View>

        <View style={styles.lastMessageContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {item.last_message?.sender_id === user?.id && (
              (() => {
                if (item.last_message?.read) {
                  return <MaterialIcons name="done-all" size={16} color="#2196F3" style={{ marginRight: 6 }} />
                }
                if (item.last_message?.delivered_at) {
                  return <MaterialIcons name="done-all" size={16} color="#bbb" style={{ marginRight: 6 }} />
                }
                return <MaterialIcons name="done" size={16} color="#bbb" style={{ marginRight: 6 }} />
              })()
            )}
            <Text style={[styles.lastMessage, item.unread_count > 0 && styles.unreadMessage]} numberOfLines={1}>
              {item.last_message?.sender_id === user?.id ? "You: " : ""}
              {item.last_message?.content || "No messages yet"}
            </Text>
          </View>
          {item.unread_count > 0 && (
            <View style={styles.unreadDot} />
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
        initialNumToRender={12}
        windowSize={5}
        removeClippedSubviews
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
      <AppModal
        visible={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        title="New Message"
        leftAction={{ label: "Cancel", onPress: () => setShowNewMessage(false) }}
        variant="sheet"
      >
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or @username"
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
                <Text style={styles.noResultsText}>{searchLoading ? "Searching..." : "No users found (users may be hidden based on visibility settings)"}</Text>
              </View>
            ) : (
              <View style={styles.searchPrompt}>
                <MaterialIcons name="people" size={48} color="#ccc" />
                <Text style={styles.searchPromptText}>Search for community members to start a conversation</Text>
              </View>
            )
          }
        />
      </AppModal>
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
  unreadBadgeGreen: {
    backgroundColor: "#4CAF50",
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginLeft: 8,
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
