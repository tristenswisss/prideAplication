"use client"

import { useEffect, useMemo, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { socialService } from "../../services/socialService"
import { liveEventService } from "../../services/liveEventService"
import { realtime, type Unsubscribe } from "../../lib/realtime"
import type { Post, UserProfile as SocialUserProfile } from "../../types/social"
import type { CommunityScreenProps } from "../../types/navigation"

export default function CommunityScreen({ navigation }: CommunityScreenProps) {
  const { user } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [composerText, setComposerText] = useState("")
  const [creating, setCreating] = useState(false)
  const [liveCount, setLiveCount] = useState(0)

  useEffect(() => {
    loadInitial()
    const unsubscribers: Unsubscribe[] = []

    // Realtime: subscribe to new posts
    unsubscribers.push(
      realtime.subscribeToPosts(() => {
        // Lightweight approach: refresh the feed
        refresh()
      }),
    )

    return () => {
      unsubscribers.forEach((u) => u())
    }
  }, [])

  const loadInitial = async () => {
    try {
      setLoading(true)
      const [feed, liveEvents] = await Promise.all([
        socialService.getFeedPosts(user?.id),
        liveEventService.getLiveEvents(),
      ])
      setPosts(feed)
      const liveNow = (liveEvents || []).filter((e) => e.is_live)
      setLiveCount(liveNow.length)
    } catch (error) {
      console.error("Error loading community feed:", error)
      Alert.alert("Error", "Failed to load community feed")
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    try {
      setRefreshing(true)
      const [feed, liveEvents] = await Promise.all([
        socialService.getFeedPosts(user?.id),
        liveEventService.getLiveEvents(),
      ])
      setPosts(feed)
      const liveNow = (liveEvents || []).filter((e) => e.is_live)
      setLiveCount(liveNow.length)
    } catch (error) {
      console.error("Error refreshing feed:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const canPost = useMemo(() => !!user?.id, [user?.id])

  const handleCreatePost = async () => {
    if (!canPost) {
      Alert.alert("Sign in required", "Please sign in to share a post")
      return
    }
    const content = composerText.trim()
    if (!content) {
      Alert.alert("Empty post", "Please write something to share")
      return
    }
    try {
      setCreating(true)
      const profileForPost: SocialUserProfile = {
        id: user!.id,
        email: user?.email || "",
        name: user?.name || "User",
        avatar_url: user?.avatar_url,
        interests: [],
        verified: false,
        follower_count: 0,
        following_count: 0,
        post_count: 0,
        is_online: false,
        created_at: new Date().toISOString(),
      }

      const newPost = await socialService.createPost({
        user_id: user!.id,
        user: profileForPost,
        content,
        images: [],
        tags: [],
        visibility: "public",
      })

      setComposerText("")
      setShowComposer(false)
      setPosts((prev) => [newPost, ...prev])
    } catch (error) {
      console.error("Error creating post:", error)
      Alert.alert("Error", "Failed to create post")
    } finally {
      setCreating(false)
    }
  }

  const handleLike = async (post: Post) => {
    if (!user?.id) return
    try {
      await socialService.likePost(post.id, user.id)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
            : p,
        ),
      )
    } catch (error) {
      console.error("Error liking post:", error)
    }
  }

  const handleSave = async (post: Post) => {
    if (!user?.id) return
    try {
      await socialService.savePost(post.id, user.id)
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_saved: !p.is_saved } : p)))
    } catch (error) {
      console.error("Error saving post:", error)
    }
  }

  const handleHide = async (post: Post) => {
    if (!user?.id) return
    try {
      await socialService.hidePost(post.id, user.id)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch (error) {
      console.error("Error hiding post:", error)
    }
  }

  const renderHeader = () => (
    <>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSubtitle}>Connect with your Pride family</Text>
        <TouchableOpacity style={styles.messagesButton} onPress={() => navigation.navigate("Messages" as any)}>
          <MaterialIcons name="message" size={22} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {liveCount > 0 && (
        <TouchableOpacity
          style={styles.liveEventsBanner}
          onPress={() => navigation.navigate("Events" as any, { screen: "EventsMain" })}
        >
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.liveEventsText}>
            {liveCount} live event{liveCount > 1 ? "s" : ""} happening now
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="white" />
        </TouchableOpacity>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate("Messages" as any)}>
          <MaterialIcons name="message" size={24} color="#FF6B6B" />
          <Text style={styles.quickActionText}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate("Events" as any, { screen: "EventsMain" })}
        >
          <MaterialIcons name="event" size={24} color="#4ECDC4" />
          <Text style={styles.quickActionText}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton} onPress={() => setShowComposer(true)}>
          <MaterialIcons name="add-circle" size={24} color="#FFD166" />
          <Text style={styles.quickActionText}>Post</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.createPostPrompt} onPress={() => setShowComposer(true)}>
        <View style={styles.promptAvatar}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          ) : (
            <MaterialIcons name="person" size={24} color="#999" />
          )}
        </View>
        <Text style={styles.promptText}>Share something with the community...</Text>
        <MaterialIcons name="add" size={24} color="black" />
      </TouchableOpacity>

      {showComposer && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={composerText}
              onChangeText={setComposerText}
              placeholder="What's on your mind?"
              multiline
            />
            <View style={styles.composerActions}>
              <TouchableOpacity style={styles.composerCancel} onPress={() => setShowComposer(false)} disabled={creating}>
                <Text style={styles.composerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.composerPost} onPress={handleCreatePost} disabled={creating}>
                <Text style={styles.composerPostText}>{creating ? "Posting..." : "Post"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  )

  const renderPostItem = ({ item }: { item: Post }) => {
    const authorName = item.user?.name || "User"
    const avatarUrl = item.user?.avatar_url
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postAuthor}
            onPress={() => navigation.navigate("UserProfile" as any, { userId: item.user_id })}
          >
            <View style={styles.authorAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
              ) : (
                <MaterialIcons name="person" size={22} color="#999" />
              )}
            </View>
            <View style={styles.authorMeta}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.postTime}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleHide(item)}>
            <MaterialIcons name="more-vert" size={22} color="#333" />
          </TouchableOpacity>
        </View>

        {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}

        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.postImage} />
        ) : null}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.postAction} onPress={() => handleLike(item)}>
            <MaterialIcons name={item.is_liked ? "favorite" : "favorite-border"} size={20} color="#FF6B6B" />
            <Text style={styles.postActionText}>{item.likes_count}</Text>
          </TouchableOpacity>
          <View style={styles.postAction}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#666" />
            <Text style={styles.postActionText}>{item.comments_count}</Text>
          </View>
          <TouchableOpacity style={styles.postAction} onPress={() => handleSave(item)}>
            <MaterialIcons name={item.is_saved ? "bookmark" : "bookmark-border"} size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.postAction} onPress={() => socialService.sharePost(item.id, user?.id || "")}>
            <MaterialIcons name="share" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderPostItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyDescription}>Be the first to share something with the community.</Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#ddd",
    fontSize: 13,
  },
  messagesButton: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 8,
  },
  liveEventsBanner: {
    backgroundColor: "#FF6B6B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: -12,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
    marginRight: 6,
  },
  liveText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  liveEventsText: {
    color: "white",
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
  },
  quickActions: {
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  quickActionText: {
    fontWeight: "600",
    color: "#333",
  },
  createPostPrompt: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promptAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  promptText: {
    color: "#666",
    flex: 1,
    marginHorizontal: 10,
  },
  composer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  composerInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  composerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  composerCancel: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  composerCancelText: {
    color: "#333",
    fontWeight: "600",
  },
  composerPost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
  },
  composerPostText: {
    color: "white",
    fontWeight: "bold",
  },
  postCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postAuthor: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  authorMeta: {},
  authorName: {
    fontWeight: "700",
    color: "#222",
  },
  postTime: {
    color: "#999",
    fontSize: 12,
  },
  postContent: {
    marginTop: 10,
    color: "#333",
    fontSize: 15,
    lineHeight: 20,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#ddd",
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 16,
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postActionText: {
    color: "#333",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  emptyDescription: {
    color: "#666",
  },
})

