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
  ScrollView,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { socialService } from "../../services/socialService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Post, UserProfile } from "../../types/social"

export default function UserProfileScreen({ navigation, route }: any) {
  const { userId } = route.params
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "likes">("posts")
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const { user: currentUser } = useAuth()
  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    loadProfile()
    loadUserPosts()
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      // Fallback: derive profile from first post author or stub
      const userPosts = await socialService.getPosts(userId)
      setPosts(userPosts)
      const first = userPosts[0]?.user
      if (first) {
        // Honor privacy: if show_profile is false and not own profile, block view
        const canView = isOwnProfile || (first as any).show_profile !== false
        setProfile(canView ? first : {
          ...first,
          name: "Private Profile",
          bio: "This profile is private",
          interests: [],
          avatar_url: first?.avatar_url,
        } as any)
      } else {
        setProfile({
          id: userId,
          email: "",
          name: "User",
          interests: [],
          verified: false,
          follower_count: 0,
          following_count: 0,
          post_count: 0,
          is_online: false,
          created_at: new Date().toISOString(),
        } as UserProfile)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      Alert.alert("Error", "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const loadUserPosts = async () => {
    try {
      const userPosts = await socialService.getPosts(userId)
      setPosts(userPosts)
    } catch (error) {
      console.error("Error loading user posts:", error)
    }
  }

  const handleFollow = async () => {
    if (!currentUser) return

    try {
      // Follow/unfollow not implemented in service; toggle local state
      if (isFollowing) {
        setIsFollowing(false)
        if (profile) setProfile({ ...profile, follower_count: Math.max(0, profile.follower_count - 1) })
        Alert.alert("Unfollowed", "You have unfollowed this user")
      } else {
        setIsFollowing(true)
        if (profile) setProfile({ ...profile, follower_count: profile.follower_count + 1 })
        Alert.alert("Followed", "You are now following this user")
      }
    } catch (error) {
      console.error("Error following/unfollowing user:", error)
      Alert.alert("Error", "Failed to update follow status")
    }
  }

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity style={styles.postItem}>
      {item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.postThumbnail} />
      ) : (
        <View style={styles.textPostThumbnail}>
          <Text style={styles.textPostPreview} numberOfLines={3}>
            {item.content}
          </Text>
        </View>
      )}
      <View style={styles.postStats}>
        <View style={styles.postStat}>
          <MaterialIcons name="favorite" size={12} color="#FF6B6B" />
          <Text style={styles.postStatText}>{item.likes_count}</Text>
        </View>
        <View style={styles.postStat}>
          <MaterialIcons name="chat-bubble" size={12} color="#666" />
          <Text style={styles.postStatText}>{item.comments_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.name}</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
          <LinearGradient colors={["black", "black"]} style={styles.coverImage} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { alignItems: "center", justifyContent: "center", backgroundColor: "#eee" }]}>
                <MaterialIcons name="person" size={40} color="#ccc" />
              </View>
            )}
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={20} color="#4CAF50" />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{profile.name}</Text>
            </View>
            <Text style={styles.username}>@{profile.username || profile.name.toLowerCase().replace(/\s+/g, "")}</Text>
            {profile.pronouns && <Text style={styles.pronouns}>{profile.pronouns}</Text>}
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            {profile.location && (
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={16} color="#666" />
                <Text style={styles.location}>{profile.location}</Text>
              </View>
            )}

            {/* Interests */}
            {profile.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                {profile.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.stat}>
                <Text style={styles.statNumber}>{profile.post_count}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stat}>
                <Text style={styles.statNumber}>{profile.follower_count}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stat}>
                <Text style={styles.statNumber}>{profile.following_count}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {isOwnProfile ? (
                <TouchableOpacity style={styles.editButton}>
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                    onPress={handleFollow}
                  >
                    <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.messageButton}>
                    <MaterialIcons name="message" size={20} color="#4ECDC4" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Content Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "posts" && styles.activeTab]}
            onPress={() => setActiveTab("posts")}
          >
            <MaterialIcons name="grid-on" size={20} color={activeTab === "posts" ? "#FF6B6B" : "#666"} />
            <Text style={[styles.tabText, activeTab === "posts" && styles.activeTabText]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "media" && styles.activeTab]}
            onPress={() => setActiveTab("media")}
          >
            <MaterialIcons name="photo" size={20} color={activeTab === "media" ? "#FF6B6B" : "#666"} />
            <Text style={[styles.tabText, activeTab === "media" && styles.activeTabText]}>Media</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "likes" && styles.activeTab]}
            onPress={() => setActiveTab("likes")}
          >
            <MaterialIcons name="favorite" size={20} color={activeTab === "likes" ? "#FF6B6B" : "#666"} />
            <Text style={[styles.tabText, activeTab === "likes" && styles.activeTabText]}>Likes</Text>
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          numColumns={3}
          scrollEnabled={false}
          contentContainerStyle={styles.postsGrid}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  moreButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  coverImageContainer: {
    height: 150,
  },
  coverImage: {
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    alignSelf: "flex-start",
    marginTop: -40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "white",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    marginTop: 15,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  username: {
    fontSize: 16,
    color: "#666",
    marginTop: 2,
  },
  pronouns: {
    fontSize: 14,
    color: "#4ECDC4",
    marginTop: 4,
    fontWeight: "600",
  },
  bio: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginTop: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  location: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  interestTag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 12,
    color: "#666",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 20,
  },
  stat: {
    alignItems: "center",
    marginRight: 30,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  editButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  followButton: {
    flex: 1,
    backgroundColor: "black",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginRight: 10,
  },
  followingButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  followButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  followingButtonText: {
    color: "#333",
  },
  messageButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "black",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FF6B6B",
  },
  postsGrid: {
    padding: 2,
  },
  postItem: {
    flex: 1,
    margin: 2,
    aspectRatio: 1,
    position: "relative",
  },
  postThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  textPostThumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    justifyContent: "center",
  },
  textPostPreview: {
    fontSize: 12,
    color: "#333",
    lineHeight: 16,
  },
  postStats: {
    position: "absolute",
    bottom: 5,
    right: 5,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  postStat: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 5,
  },
  postStatText: {
    fontSize: 10,
    color: "white",
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
