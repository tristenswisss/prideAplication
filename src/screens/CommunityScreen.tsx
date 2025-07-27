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
  ScrollView,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { socialService } from "../../services/socialService"
import { pushNotificationService } from "../../services/pushNotificationService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Post, Comment } from "../../types/social"
import type { CommunityScreenProps } from "../../types/navigation"

export default function CommunityScreen({ navigation }: CommunityScreenProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newPostContent, setNewPostContent] = useState("")
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    loadPosts()
    initializePushNotifications()
  }, [])

  const initializePushNotifications = async () => {
    try {
      await pushNotificationService.initialize()
      await pushNotificationService.startLocationNotifications()
    } catch (error) {
      console.error("Error initializing push notifications:", error)
    }
  }

  const loadPosts = async () => {
    try {
      setLoading(true)
      const data = await socialService.getFeedPosts(user?.id)
      setPosts(data)
    } catch (error) {
      console.error("Error loading posts:", error)
      Alert.alert("Error", "Failed to load posts")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return

    try {
      const newPost = await socialService.createPost({
        user_id: user.id,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: "/placeholder.svg?height=50&width=50&text=" + user.name.charAt(0),
          verified: false,
          follower_count: 0,
          following_count: 0,
          post_count: 0,
          interests: [],
          created_at: user.created_at,
          updated_at: user.created_at,
        },
        content: newPostContent,
        images: [],
        tags: extractHashtags(newPostContent),
        visibility: "public",
      })

      setPosts([newPost, ...posts])
      setNewPostContent("")
      setShowCreatePost(false)
      Alert.alert("Success", "Your post has been shared!")
    } catch (error) {
      console.error("Error creating post:", error)
      Alert.alert("Error", "Failed to create post")
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!user) return

    try {
      await socialService.likePost(postId, user.id)
      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: !post.is_liked,
                likes_count: post.likes_count + (post.is_liked ? -1 : 1),
              }
            : post,
        ),
      )

      // Send notification to post owner
      const post = posts.find((p) => p.id === postId)
      if (post && post.user_id !== user.id) {
        await pushNotificationService.sendSocialNotification(post.user_id, "post_like", {
          likerName: user.name,
          postId,
        })
      }
    } catch (error) {
      console.error("Error liking post:", error)
    }
  }

  const handleSavePost = async (postId: string) => {
    if (!user) return

    try {
      await socialService.savePost(postId, user.id)
      setPosts(posts.map((post) => (post.id === postId ? { ...post, is_saved: !post.is_saved } : post)))
    } catch (error) {
      console.error("Error saving post:", error)
    }
  }

  const handleSharePost = async (postId: string) => {
    if (!user) return

    try {
      await socialService.sharePost(postId, user.id)
      setPosts(posts.map((post) => (post.id === postId ? { ...post, shares_count: post.shares_count + 1 } : post)))
      Alert.alert("Shared", "Post shared successfully!")
    } catch (error) {
      console.error("Error sharing post:", error)
    }
  }

  const handleShowComments = async (post: Post) => {
    try {
      setSelectedPost(post)
      const postComments = await socialService.getPostComments(post.id)
      setComments(postComments)
      setShowComments(true)
    } catch (error) {
      console.error("Error loading comments:", error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !selectedPost) return

    try {
      const comment = await socialService.addComment({
        post_id: selectedPost.id,
        user_id: user.id,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: "/placeholder.svg?height=40&width=40&text=" + user.name.charAt(0),
          verified: false,
          follower_count: 0,
          following_count: 0,
          post_count: 0,
          interests: [],
          created_at: user.created_at,
          updated_at: user.created_at,
        },
        content: newComment,
      })

      setComments([...comments, comment])
      setNewComment("")

      // Update post comment count
      setPosts(
        posts.map((post) =>
          post.id === selectedPost.id ? { ...post, comments_count: post.comments_count + 1 } : post,
        ),
      )

      // Send notification to post owner
      if (selectedPost.user_id !== user.id) {
        await pushNotificationService.sendSocialNotification(selectedPost.user_id, "comment", {
          commenterName: user.name,
          postId: selectedPost.id,
        })
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const extractHashtags = (text: string): string[] => {
    const hashtags = text.match(/#\w+/g)
    return hashtags ? hashtags.map((tag) => tag.substring(1)) : []
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Image source={{ uri: item.user?.avatar_url }} style={styles.userAvatar} />
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{item.user?.name}</Text>
            {item.user?.verified && <MaterialIcons name="verified" size={16} color="#4CAF50" />}
          </View>
          <Text style={styles.userHandle}>
            @{item.user?.username || item.user?.name.toLowerCase().replace(/\s+/g, "")}
          </Text>
          <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{item.content}</Text>

      {/* Post Images */}
      {item.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
          {item.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.postImage} />
          ))}
        </ScrollView>
      )}

      {/* Location */}
      {item.location && (
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>{item.location.name}</Text>
        </View>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <Text key={index} style={styles.hashtag}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLikePost(item.id)}>
          <MaterialIcons
            name={item.is_liked ? "favorite" : "favorite-border"}
            size={20}
            color={item.is_liked ? "#FF6B6B" : "#666"}
          />
          <Text style={[styles.actionText, item.is_liked && styles.likedText]}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleShowComments(item)}>
          <MaterialIcons name="chat-bubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePost(item.id)}>
          <MaterialIcons name="share" size={20} color="#666" />
          <Text style={styles.actionText}>{item.shares_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleSavePost(item.id)}>
          <MaterialIcons
            name={item.is_saved ? "bookmark" : "bookmark-border"}
            size={20}
            color={item.is_saved ? "#4ECDC4" : "#666"}
          />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentCard}>
      <Image source={{ uri: item.user?.avatar_url }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.user?.name}</Text>
          <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
        <TouchableOpacity style={styles.commentLike}>
          <MaterialIcons
            name={item.is_liked ? "favorite" : "favorite-border"}
            size={14}
            color={item.is_liked ? "#FF6B6B" : "#666"}
          />
          <Text style={styles.commentLikeText}>{item.likes_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSubtitle}>Connect with your Pride family</Text>
      </LinearGradient>

      {/* Posts Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        style={styles.feed}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          loadPosts()
        }}
        ListHeaderComponent={
          <TouchableOpacity style={styles.createPostPrompt} onPress={() => setShowCreatePost(true)}>
            <Image
              source={{ uri: user?.avatar_url || "/placeholder.svg?height=40&width=40&text=U" }}
              style={styles.promptAvatar}
            />
            <Text style={styles.promptText}>Share something with the community...</Text>
            <MaterialIcons name="add" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        }
      />

      {/* Create Post Modal */}
      <Modal visible={showCreatePost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreatePost(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Post</Text>
            <TouchableOpacity onPress={handleCreatePost} disabled={!newPostContent.trim()}>
              <Text style={[styles.modalPost, !newPostContent.trim() && styles.modalPostDisabled]}>Post</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createPostContent}>
            <Image
              source={{ uri: user?.avatar_url || "/placeholder.svg?height=50&width=50&text=U" }}
              style={styles.createPostAvatar}
            />
            <TextInput
              style={styles.createPostInput}
              placeholder="What's happening in the community?"
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              autoFocus
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.createPostActions}>
            <TouchableOpacity style={styles.createPostAction}>
              <MaterialIcons name="photo" size={24} color="#4ECDC4" />
              <Text style={styles.createPostActionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createPostAction}>
              <MaterialIcons name="location-on" size={24} color="#4ECDC4" />
              <Text style={styles.createPostActionText}>Location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createPostAction}>
              <MaterialIcons name="event" size={24} color="#4ECDC4" />
              <Text style={styles.createPostActionText}>Event</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showComments} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            style={styles.commentsList}
            ListEmptyComponent={
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
              </View>
            }
          />

          <View style={styles.addCommentContainer}>
            <Image
              source={{ uri: user?.avatar_url || "/placeholder.svg?height=40&width=40&text=U" }}
              style={styles.commentInputAvatar}
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!newComment.trim()}
              style={[styles.sendCommentButton, !newComment.trim() && styles.sendCommentButtonDisabled]}
            >
              <MaterialIcons name="send" size={20} color={newComment.trim() ? "#4ECDC4" : "#ccc"} />
            </TouchableOpacity>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  feed: {
    flex: 1,
  },
  createPostPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  promptAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: "#666",
  },
  postCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 5,
  },
  userHandle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  postTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  moreButton: {
    padding: 5,
  },
  postContent: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  postImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 10,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  hashtag: {
    fontSize: 14,
    color: "#4ECDC4",
    marginRight: 8,
    marginBottom: 4,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  likedText: {
    color: "#FF6B6B",
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
  modalPost: {
    fontSize: 16,
    color: "#4ECDC4",
    fontWeight: "bold",
  },
  modalPostDisabled: {
    color: "#ccc",
  },
  createPostContent: {
    flexDirection: "row",
    padding: 20,
    alignItems: "flex-start",
  },
  createPostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  createPostInput: {
    flex: 1,
    fontSize: 18,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 100,
  },
  createPostActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  createPostAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 30,
  },
  createPostActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4ECDC4",
  },
  commentsList: {
    flex: 1,
    padding: 20,
  },
  commentCard: {
    flexDirection: "row",
    marginBottom: 15,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: "#999",
  },
  commentText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 8,
  },
  commentLike: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentLikeText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  noComments: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noCommentsText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: "#999",
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  commentInputAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  sendCommentButton: {
    marginLeft: 10,
    padding: 8,
  },
  sendCommentButtonDisabled: {
    opacity: 0.5,
  },
})
