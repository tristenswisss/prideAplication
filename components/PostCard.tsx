import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuth } from '../Contexts/AuthContexts'
import { useTheme } from '../Contexts/ThemeContext'
import { socialService } from '../services/socialService'
import { realtime } from '../lib/realtime'
import type { Post } from '../types/social'

interface PostCardProps {
  post: Post
  onLike: (postId: string) => void
  onSave: (postId: string) => void
  onComment: (post: Post) => void
  onMoreOptions: (post: Post) => void
  onUserPress: (userId: string) => void
  isLikeProcessing: boolean
  isSaveProcessing: boolean
}

export default function PostCard({
  post,
  onLike,
  onSave,
  onComment,
  onMoreOptions,
  onUserPress,
  isLikeProcessing,
  isSaveProcessing
}: PostCardProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [localPost, setLocalPost] = useState(post)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    setLocalPost(post)
  }, [post])

  useEffect(() => {
    // Check if current user is the post owner
    setIsOwner(user?.id === post.user_id)
  }, [user?.id, post.user_id])

  useEffect(() => {
    // Subscribe to real-time updates for this specific post's likes
    if (!post.id) return

    const unsubscribeLikes = realtime.subscribeToPostLikes(
      post.id,
      (event, row) => {
        setLocalPost(prev => {
          if (event === 'INSERT') {
            // Someone liked the post
            return {
              ...prev,
              likes_count: prev.likes_count + 1,
              is_liked: row.user_id === user?.id ? true : prev.is_liked
            }
          } else if (event === 'DELETE') {
            // Someone unliked the post
            return {
              ...prev,
              likes_count: Math.max(prev.likes_count - 1, 0),
              is_liked: row.user_id === user?.id ? false : prev.is_liked
            }
          }
          return prev
        })
      }
    )

    // Subscribe to post updates (for likes_count changes)
    const unsubscribePost = realtime.subscribeToPostUpdates(
      post.id,
      (updatedPost) => {
        setLocalPost(prev => ({
          ...prev,
          likes_count: updatedPost.likes_count ?? prev.likes_count,
          comments_count: updatedPost.comments_count ?? prev.comments_count,
          shares_count: updatedPost.shares_count ?? prev.shares_count
        }))
      }
    )

    return () => {
      unsubscribeLikes()
      unsubscribePost()
    }
  }, [post.id, user?.id])

  const handleLike = () => {
    if (isOwner) {
      Alert.alert("Can't Like Own Post", "You cannot like your own posts.")
      return
    }
    onLike(post.id)
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

  return (
    <View style={[styles.postCard, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => localPost.user?.id && onUserPress(localPost.user.id)}
        >
          {localPost.user?.avatar_url ? (
            <Image source={{ uri: localPost.user?.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.card }]}>
              <MaterialIcons name="person" size={24} color={theme.colors.textTertiary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <TouchableOpacity
            onPress={() => localPost.user?.id && onUserPress(localPost.user.id)}
          >
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>{localPost.user?.name}</Text>
              {localPost.user?.verified && <MaterialIcons name="verified" size={16} color={theme.colors.success} />}
            </View>
            <Text style={[styles.userHandle, { color: theme.colors.textSecondary }]}>
              @{localPost.user?.username || localPost.user?.name.toLowerCase().replace(/\s+/g, "")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.postTime, { color: theme.colors.textTertiary }]}>{formatTimeAgo(localPost.created_at)}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => onMoreOptions(localPost)}
        >
          <MaterialIcons name="more-vert" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <Text style={[styles.postContent, { color: theme.colors.text }]}>{localPost.content}</Text>

      {/* Post Images */}
      {localPost.images && localPost.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
          {localPost.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.postImage} />
          ))}
        </ScrollView>
      )}

      {/* Location */}
      {localPost.location && (
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>{localPost.location.name}</Text>
        </View>
      )}

      {/* Tags */}
      {localPost.tags && localPost.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {localPost.tags.map((tag, index) => (
            <Text key={index} style={[styles.hashtag, { color: theme.colors.secondary }]}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      {/* Post Actions */}
      <View style={[styles.postActions, { borderTopColor: theme.colors.divider }]}>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            (isLikeProcessing || isOwner) && { opacity: 0.6 }
          ]}
          onPress={handleLike}
          disabled={isLikeProcessing || isOwner}
        >
          <MaterialIcons
            name={localPost.is_liked ? "favorite" : "favorite-border"}
            size={20}
            color={
              isOwner 
                ? theme.colors.textTertiary 
                : localPost.is_liked 
                  ? theme.colors.primary 
                  : theme.colors.textSecondary
            }
          />
          <Text style={[
            styles.actionText, 
            { color: theme.colors.textSecondary }, 
            localPost.is_liked && !isOwner && [styles.likedText, { color: theme.colors.primary }],
            isOwner && { color: theme.colors.textTertiary }
          ]}>
            {localPost.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => onComment(localPost)}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>{localPost.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isSaveProcessing && { opacity: 0.6 }]}
          onPress={() => onSave(localPost.id)}
          disabled={isSaveProcessing}
        >
          <MaterialIcons
            name={localPost.is_saved ? "bookmark" : "bookmark-border"}
            size={20}
            color={localPost.is_saved ? theme.colors.secondary : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Owner indicator for debugging */}
      {__DEV__ && isOwner && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>Your Post</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  postCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  userHandle: {
    fontSize: 14,
    marginBottom: 4,
  },
  postTime: {
    fontSize: 12,
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  imagesContainer: {
    marginVertical: 8,
  },
  postImage: {
    width: 250,
    height: 200,
    borderRadius: 8,
    marginRight: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  locationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 8,
  },
  hashtag: {
    fontSize: 14,
    marginRight: 8,
    marginBottom: 4,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 6,
  },
  likedText: {
    fontWeight: "600",
  },
  debugBanner: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  debugText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
})
