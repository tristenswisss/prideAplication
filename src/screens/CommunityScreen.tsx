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
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { ScrollView } from "react-native"
import * as Location from "expo-location"
import { socialService } from "../../services/socialService"
import { imageUploadService } from "../../services/imageUploadService"
import { pushNotificationService } from "../../services/pushNotificationService"
import { profileService } from "../../services/profileService"
import { realtime } from "../../lib/realtime"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Post, Comment, UserProfile } from "../../types/social"
import type { CommunityScreenProps } from "../../types/navigation"
import { messagingService } from "../../services/messagingService"
import { buddySystemService } from "../../services/buddySystemService"
import AppModal from "../../components/AppModal"

export default function CommunityScreen({ navigation }: CommunityScreenProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newPostContent, setNewPostContent] = useState("")
  const [newPostImages, setNewPostImages] = useState<string[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; name?: string } | null>(
    null,
  )
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharePost, setSharePost] = useState<Post | null>(null)
  const [buddyList, setBuddyList] = useState<UserProfile[]>([])

  const { user } = useAuth()

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadPosts()
      loadBuddyList()
    })
    return unsubscribe
  }, [navigation, user?.id])

  useEffect(() => {
    loadPosts()
    initializePushNotifications()
    getCurrentLocation()
    loadBuddyList()
    const unsubPosts = realtime.subscribeToPosts((row: any) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === row.id)) return prev
        return [{ ...(row as any), is_liked: false, is_saved: false }, ...prev]
      })
    })
    const unsubComments = realtime.subscribeToComments((row: any) => {
      setPosts((prev) => prev.map((p) => (p.id === row.post_id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p)))
    })
    return () => {
      unsubPosts()
      unsubComments()
    }
  }, [])

  const initializePushNotifications = async () => {
    try {
      await pushNotificationService.initialize()
      await pushNotificationService.startLocationNotifications()
    } catch (error) {
      console.error("Error initializing push notifications:", error)
    }
  }

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        console.log("Location permission denied")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        name: address[0]?.city || "Current Location",
      })
    } catch (error) {
      console.error("Error getting location:", error)
    }
  }

  const loadBuddyList = async () => {
    if (!user) return

    try {
      // This would typically come from a buddy service
      // For now, we'll use a simple search to get some users
      const result = await profileService.searchUsers("", user.id)
      if (result.success && result.data) {
        // Convert UserProfile from index.ts to social.ts format
        const socialUserProfiles: UserProfile[] = result.data.map((profile) => ({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          cover_image_url: profile.cover_image_url,
          bio: profile.bio,
          pronouns: profile.pronouns,
          location: profile.location,
          interests: profile.interests || [], // Ensure interests is always an array
          verified: profile.verified || false,
          follower_count: profile.follower_count || 0, // Ensure it's always a number
          following_count: profile.following_count || 0, // Ensure it's always a number
          post_count: profile.post_count || 0, // Ensure it's always a number
          is_online: profile.is_online || false, // Ensure it's always a boolean
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        }))
        setBuddyList(socialUserProfiles.slice(0, 10)) // Limit to 10 for demo
      }
    } catch (error) {
      console.error("Error loading buddy list:", error)
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
      // Upload images if selected
      const uploadedImages = []
      for (const imageUri of newPostImages) {
        const result = await imageUploadService.uploadImage(imageUri, user.id, "posts")
        if (result.success && result.url) {
          uploadedImages.push(result.url)
        }
      }

      const postData = {
        user_id: user.id,
        user: {
          id: user.id,
          email: user.email || "",
          name: user.name,
          avatar_url: user.avatar_url || "/placeholder.svg?height=50&width=50&text=" + user.name.charAt(0),
          verified: false,
          follower_count: 0,
          following_count: 0,
          post_count: 0,
          interests: [],
          is_online: true, // Add required is_online property
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        content: newPostContent,
        images: uploadedImages,
        tags: extractHashtags(newPostContent),
        visibility: "public" as const,
        location: currentLocation
          ? {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              name: currentLocation.name,
            }
          : undefined,
      }

      const newPost = await socialService.createPost(postData)
      setPosts([newPost, ...posts])
      setNewPostContent("")
      setNewPostImages([])
      setShowCreatePost(false)
      Alert.alert("Success", "Your post has been shared!")
    } catch (error) {
      console.error("Error creating post:", error)
      Alert.alert("Error", "Failed to create post")
    }
  }

  const handlePickImage = async () => {
    try {
      const result = await imageUploadService.pickImage()
      if (result && !result.canceled && result.assets && result.assets[0] && newPostImages.length < 5) {
        setNewPostImages([...newPostImages, result.assets[0].uri])
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const handleTakePhoto = async () => {
    try {
      const result = await imageUploadService.takePhoto()
      if (result && !result.canceled && result.assets && result.assets[0] && newPostImages.length < 5) {
        setNewPostImages([...newPostImages, result.assets[0].uri])
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo")
    }
  }

  const handleRemoveImage = (index: number) => {
    setNewPostImages(newPostImages.filter((_, i) => i !== index))
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

  const handleDeletePost = async (postId: string) => {
    if (!user) return

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await socialService.deletePost(postId, user.id)
            setPosts(posts.filter((post) => post.id !== postId))
            Alert.alert("Success", "Post deleted successfully")
          } catch (error) {
            console.error("Error deleting post:", error)
            Alert.alert("Error", "Failed to delete post")
          }
        },
      },
    ])
  }

  const handleSharePost = async (post: Post) => {
    setSharePost(post)
    setShowShareModal(true)
  }

  const shareToUser = async (targetUser: UserProfile) => {
    if (!user || !sharePost) return

    try {
      // This would typically send a message or notification
      // For now, we'll just increment the share count
      await socialService.sharePost(sharePost.id, user.id)
      setPosts(
        posts.map((post) => (post.id === sharePost.id ? { ...post, shares_count: post.shares_count + 1 } : post)),
      )

      setShowShareModal(false)
      setSharePost(null)
      Alert.alert("Shared", `Post shared with ${targetUser.name}!`)
    } catch (error) {
      console.error("Error sharing post:", error)
      Alert.alert("Error", "Failed to share post")
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
          email: user.email || "",
          name: user.name,
          avatar_url: user.avatar_url || "/placeholder.svg?height=40&width=40&text=" + user.name.charAt(0),
          verified: false,
          follower_count: 0,
          following_count: 0,
          post_count: 0,
          interests: [],
          is_online: true, // Add required is_online property
          created_at: new Date().toISOString(),
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

  const handleAddLocation = () => {
    if (currentLocation) {
      setNewPostContent((prev) => prev + ` 📍 ${currentLocation.name}`)
    } else {
      Alert.alert("Location", "Getting your location...", [{ text: "OK", onPress: getCurrentLocation }])
    }
  }

  const handleAddEvent = () => {
    // Navigate to event selection or creation
    navigation.navigate("Messages")
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

  const handleMessageUser = async (post: Post) => {
    if (!user || post.user_id === user.id) return
    try {
      const conversation = await messagingService.getOrCreateDirectConversation(user.id, post.user_id)
      navigation.navigate("Chat", { conversation })
    } catch (err: any) {
      if (typeof err?.message === "string" && err.message === "dms_disabled") {
        Alert.alert(
          "DMs are off",
          "This user only accepts messages from buddies. Send a buddy request?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Request Buddy", onPress: () => handleRequestBuddy(post) },
          ],
        )
      } else if (typeof err?.message === "string" && err.message === "blocked") {
        Alert.alert("Cannot message", "You cannot message this user.")
      } else {
        Alert.alert("Error", "Failed to start conversation")
      }
    }
  }

  const handleRequestBuddy = async (post: Post) => {
    if (!user || post.user_id === user.id) return
    try {
      await buddySystemService.sendBuddyRequest(user.id, post.user_id, "Hi! I'd like to connect as buddies.")
      Alert.alert("Buddy Request Sent", "They'll be notified of your request.")
    } catch (error) {
      Alert.alert("Error", "Failed to send buddy request")
    }
  }

  const handleHidePost = async (post: Post) => {
    if (!user) return
    try {
      await socialService.hidePost(post.id, user.id)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } catch (error) {
      Alert.alert("Error", "Failed to hide post")
    }
  }

  const handleBlockUser = async (post: Post) => {
    if (!user) return
    Alert.alert("Block User", `Block ${post.user?.name || "this user"}? You won't see their posts again.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          const ok = await messagingService.blockUser(user.id, post.user_id)
          if (ok) {
            setPosts((prev) => prev.filter((p) => p.user_id !== post.user_id))
            Alert.alert("Blocked", "You will no longer see posts from this user.")
          } else {
            Alert.alert("Error", "Failed to block user")
          }
        },
      },
    ])
  }

  const handleMoreOptions = async (post: Post) => {
    const isOwner = post.user_id === user?.id
    const posterName = post.user?.name || "User"
    const saveLabel = post.is_saved ? "Unsave" : "Save"
    const actions: any[] = [{ text: "Cancel", style: "cancel" }]

    if (!isOwner) {
      // Only show Message if allowed by target's settings (appear_in_search && allow_direct_messages)
      const canDM = post.user?.allow_direct_messages !== false
      if (canDM) {
        actions.push({ text: "Message", onPress: () => handleMessageUser(post) })
      }
      actions.push({ text: "Request Buddy", onPress: () => handleRequestBuddy(post) })
      actions.push({ text: "Block User", style: "destructive", onPress: () => handleBlockUser(post) })
    } else {
      actions.push({ text: "Delete", style: "destructive", onPress: () => handleDeletePost(post.id) })
    }

    actions.push({ text: "Hide", onPress: () => handleHidePost(post) })
    actions.push({ text: saveLabel, onPress: () => handleSavePost(post.id) })
    actions.push({ text: "Share to Contacts", onPress: () => handleSharePost(post) })

    Alert.alert(
      "Post Options",
      isOwner ? "Manage your post" : `Options for @${post.user?.username || posterName.toLowerCase().replace(/\s+/g, "")}`,
      actions,
    )
  }

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => item.user?.id && navigation.navigate("UserProfile", { userId: item.user.id })}
        >
          {item.user?.avatar_url ? (
            <Image source={{ uri: item.user?.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { alignItems: "center", justifyContent: "center", backgroundColor: "#eee" }]}>
              <MaterialIcons name="person" size={24} color="#ccc" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <TouchableOpacity
            onPress={() => item.user?.id && navigation.navigate("UserProfile", { userId: item.user.id })}
          >
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.user?.name}</Text>
              {item.user?.verified && <MaterialIcons name="verified" size={16} color="#4CAF50" />}
            </View>
            <Text style={styles.userHandle}>
              @{item.user?.username || item.user?.name.toLowerCase().replace(/\s+/g, "")}
            </Text>
          </TouchableOpacity>
          <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => handleMoreOptions(item)}
        >
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

        <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePost(item)}>
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

  const renderBuddyItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.buddyItem} onPress={() => shareToUser(item)}>
      <Image
        source={{ uri: item.avatar_url || "/placeholder.svg?height=40&width=40&text=" + item.name.charAt(0) }}
        style={styles.buddyAvatar}
      />
      <Text style={styles.buddyName}>{item.name}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSubtitle}>Connect with your Pride family</Text>
        <TouchableOpacity style={styles.messagesButton} onPress={() => navigation.navigate("Messages")}>
          <MaterialIcons name="message" size={24} color="white" />
        </TouchableOpacity>
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
          <>
            <TouchableOpacity style={styles.createPostPrompt} onPress={() => setShowCreatePost(true)}>
              <Image
                source={{ uri: user?.avatar_url || "/placeholder.svg?height=40&width=40&text=U" }}
                style={styles.promptAvatar}
              />
              <MaterialIcons name="add-circle" size={24} color="#FFD166" />
              <Text style={[styles.promptText, { marginLeft: 10 }]}>Share something with the community...</Text>
            </TouchableOpacity>
          </>
        }
      />

      {/* Create Post Modal */}
      <AppModal
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        title="Create Post"
        leftAction={{ label: "Cancel", onPress: () => setShowCreatePost(false) }}
        rightAction={{ label: "Post", onPress: handleCreatePost, disabled: !newPostContent.trim() }}
        variant="sheet"
      >
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

        {newPostImages.length > 0 && (
          <ScrollView horizontal style={styles.imagePreviewContainer}>
            {newPostImages.map((imageUri, index) => (
              <View key={index} style={styles.imagePreviewItem}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(index)}>
                  <MaterialIcons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.createPostActions}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.createPostAction} onPress={handlePickImage}>
              <MaterialIcons name="photo-library" size={24} color="black" />
              <Text style={styles.createPostActionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createPostAction} onPress={handleTakePhoto}>
              <MaterialIcons name="camera-alt" size={24} color="black" />
              <Text style={styles.createPostActionText}>Camera</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.createPostAction} onPress={handleAddLocation}>
              <MaterialIcons name="location-on" size={24} color="black" />
              <Text style={styles.createPostActionText}>Location</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createPostAction} onPress={handleAddEvent}>
              <MaterialIcons name="event" size={24} color="black" />
              <Text style={styles.createPostActionText}>Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>

      {/* Comments Modal */}
      <AppModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        title="Comments"
        leftAction={{ label: "Close", onPress: () => setShowComments(false) }}
        variant="sheet"
      >
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
            <MaterialIcons name="send" size={20} color={newComment.trim() ? "gold" : "#ccc"} />
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Share Modal */}
      <AppModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Post"
        leftAction={{ label: "Cancel", onPress: () => setShowShareModal(false) }}
        variant="sheet"
      >
        <FlatList
          data={buddyList}
          renderItem={renderBuddyItem}
          keyExtractor={(item) => item.id}
          style={styles.buddyList}
          ListEmptyComponent={
            <View style={styles.noBuddies}>
              <MaterialIcons name="people" size={64} color="#ccc" />
              <Text style={styles.noBuddiesText}>No contacts found</Text>
              <Text style={styles.noBuddiesSubtext}>Connect with people to share posts</Text>
            </View>
          }
        />
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
  imagePreviewContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  imagePreviewItem: {
    position: "relative",
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "black",
    borderRadius: 15,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  createPostActions: {
    flexDirection: "column",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  createPostAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    paddingVertical: 8,
  },
  createPostActionText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4ECDC4",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
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
  messagesButton: {
    position: "absolute",
    right: 20,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "white",
    margin: 15,
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionButton: {
    alignItems: "center",
  },
  quickActionText: {
    marginTop: 5,
    fontSize: 12,
    color: "#666",
  },
  buddyList: {
    flex: 1,
    padding: 20,
  },
  buddyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  buddyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  buddyName: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  noBuddies: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noBuddiesText: {
    fontSize: 18,
    color: "#666",
    marginTop: 15,
    marginBottom: 5,
  },
  noBuddiesSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
})

