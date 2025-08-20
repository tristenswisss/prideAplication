"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, Image, ScrollView, Alert, Share } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { socialService } from "../../services/socialService"
import { useAuth } from "../../Contexts/AuthContexts"
import { eventService } from "../../services/eventService"
import { messagingService } from "../../services/messagingService"
import { supabase } from "../../lib/supabase"
import { profileService } from "../../services/profileService"
import type { Post, UserProfile } from "../../types/social"
import AppModal from "../../components/AppModal"

export default function UserProfileScreen({ navigation, route }: any) {
  const { userId } = route.params
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<"posts" | "events">("posts")
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ visible: boolean; title?: string; message?: string }>(
    { visible: false },
  )
  const [userEvents, setUserEvents] = useState<any[]>([])
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const { user: currentUser } = useAuth()
  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    loadProfile()
    loadUserPosts()
    loadUserEvents()
  }, [userId])

  const loadProfile = async () => {
    try {
      setLoading(true)
      // Fetch canonical profile from DB
      const result = await profileService.getProfile(userId)
      if (result.success && result.data) {
        const dbUser: any = result.data
        const prof = Array.isArray(dbUser.profiles) ? dbUser.profiles[0] : dbUser.profiles
        // Fetch presence if available
        const { data: statusRows } = await supabase
          .from('user_status')
          .select('is_online, last_seen')
          .eq('user_id', userId)
          .limit(1)
        const isOnline = Array.isArray(statusRows) && statusRows[0]?.is_online ? true : false

        const full: UserProfile = {
          id: dbUser.id,
          email: dbUser.email || "",
          name: dbUser.name || "User",
          username: prof?.username,
          avatar_url: dbUser.avatar_url || undefined,
          cover_image_url: dbUser.cover_image_url || undefined,
          bio: dbUser.bio || undefined,
          pronouns: dbUser.pronouns || undefined,
          location: dbUser.location || undefined,
          interests: Array.isArray(dbUser.interests) ? dbUser.interests : [],
          verified: !!dbUser.verified,
          follower_count: Number(dbUser.follower_count || 0),
          following_count: Number(dbUser.following_count || 0),
          post_count: Number(dbUser.post_count || 0),
          is_online: isOnline,
          created_at: dbUser.created_at,
          show_profile: prof?.show_profile,
          show_activities: prof?.show_activities,
          appear_in_search: prof?.appear_in_search,
          allow_direct_messages: prof?.allow_direct_messages,
        }
        // Honor privacy settings if viewing someone else
        if (!isOwnProfile && full.show_profile === false) {
          setProfile({
            ...full,
            name: "Private Profile",
            bio: "This profile is private",
            interests: [],
          })
        } else {
          setProfile(full)
        }
      } else {
        // Fallback stub when profile missing
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
      setModal({ visible: true, title: "Error", message: "Failed to load profile" })
    } finally {
      setLoading(false)
    }
  }

  const loadUserPosts = async () => {
    try {
      const userPosts = await socialService.getPosts()
      // Filter to posts authored by this user
      const filtered = (userPosts || []).filter((p) => p.user_id === userId)
      setPosts(filtered)
    } catch (error) {
      console.error("Error loading user posts:", error)
    }
  }

  const loadUserEvents = async () => {
    try {
      const events = await eventService.getEventsByOrganizer(userId)
      setUserEvents(events)
    } catch (e) {
      // ignore
    }
  }

  // Realtime refresh when the viewed user's profile changes
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`user-profile:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        () => loadProfile(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        () => loadProfile(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleFollow = async () => {
    if (!currentUser) return

    try {
      // Follow/unfollow not implemented in service; toggle local state
      if (isFollowing) {
        setIsFollowing(false)
        if (profile) setProfile({ ...profile, follower_count: Math.max(0, profile.follower_count - 1) })
        setModal({ visible: true, title: "Unfollowed", message: "You have unfollowed this user" })
      } else {
        setIsFollowing(true)
        if (profile) setProfile({ ...profile, follower_count: profile.follower_count + 1 })
        setModal({ visible: true, title: "Followed", message: "You are now following this user" })
      }
    } catch (error) {
      console.error("Error following/unfollowing user:", error)
      setModal({ visible: true, title: "Error", message: "Failed to update follow status" })
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

  const renderEvent = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.eventItem}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <MaterialIcons name="event" size={20} color="#666" />
        <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
      </View>
      <View style={{ flexDirection: "row", marginTop: 6, alignItems: "center" }}>
        <MaterialIcons name="location-on" size={16} color="#999" />
        <Text style={styles.eventMeta} numberOfLines={1}>{item.location} • {new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  )

  const handleMessage = async () => {
    if (!currentUser) return
    try {
      const conv = await messagingService.getOrCreateDirectConversation(currentUser.id, userId)
      navigation.navigate("Community", { screen: "Chat", params: { conversation: conv } })
    } catch (e: any) {
      const reason = e?.message || "not_allowed"
      let msg = "Unable to start conversation."
      if (reason === "blocked") msg = "You cannot message this user."
      if (reason === "dms_disabled") msg = "This user has disabled direct messages."
      setModal({ visible: true, title: "Message", message: msg })
    }
  }

  const handleAddBuddy = async () => {
    if (!currentUser) return
    try {
      // Send a default buddy request message
      await supabase.from("buddy_requests").insert({ from_user_id: currentUser.id, to_user_id: userId, message: "Let's be buddies!" })
      setModal({ visible: true, title: "Buddy Request", message: "Buddy request sent." })
    } catch (e: any) {
      setModal({ visible: true, title: "Error", message: e.message || "Failed to send buddy request" })
    }
  }

  const handleBlockUser = async () => {
    if (!currentUser) return
    try {
      await supabase.from("blocked_users").insert({ user_id: currentUser.id, blocked_user_id: userId })
      setModal({ visible: true, title: "User Blocked", message: "You will no longer see messages or requests from this user." })
    } catch (e: any) {
      setModal({ visible: true, title: "Error", message: e.message || "Failed to block user" })
    }
  }

  const handleShareProfile = async () => {
    try {
      const link = `https://mirae.app/user/${userId}`
      await Share.share({ message: `Check out this profile: ${link}` })
    } catch (e) {
      // ignore
    }
  }

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
        <TouchableOpacity style={styles.moreButton} onPress={() => setShowMoreOptions(true)}>
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
                  <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
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
            style={[styles.tab, activeTab === "events" && styles.activeTab]}
            onPress={() => setActiveTab("events")}
          >
            <MaterialIcons name="event" size={20} color={activeTab === "events" ? "#FF6B6B" : "#666"} />
            <Text style={[styles.tabText, activeTab === "events" && styles.activeTabText]}>Events</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "posts" ? (
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.postsGrid}
          />
        ) : (
          <FlatList
            data={userEvents}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          />
        )}
      </ScrollView>
      <AppModal
        visible={modal.visible}
        onClose={() => setModal({ visible: false })}
        title={modal.title}
        variant="center"
        rightAction={{ label: "OK", onPress: () => setModal({ visible: false }) }}
      >
        <Text style={{ fontSize: 16, color: "#333" }}>{modal.message}</Text>
      </AppModal>

      <AppModal
        visible={showMoreOptions}
        onClose={() => setShowMoreOptions(false)}
        title="More Options"
        variant="center"
        leftAction={{ label: "Close", onPress: () => setShowMoreOptions(false) }}
      >
        <View style={{ gap: 12 }}>
          {!isOwnProfile && (
            <TouchableOpacity onPress={() => { setShowMoreOptions(false); handleAddBuddy() }} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="person-add" size={22} color="#333" />
              <Text style={{ fontSize: 16, color: "#333" }}>Add as Buddy</Text>
            </TouchableOpacity>
          )}
          {!isOwnProfile && (
            <TouchableOpacity onPress={() => { setShowMoreOptions(false); handleBlockUser() }} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="block" size={22} color="#F44336" />
              <Text style={{ fontSize: 16, color: "#F44336" }}>Block User</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setShowMoreOptions(false); handleShareProfile() }} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialIcons name="share" size={22} color="#333" />
            <Text style={{ fontSize: 16, color: "#333" }}>Share Profile</Text>
          </TouchableOpacity>
        </View>
      </AppModal>
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
  eventItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  eventTitle: {
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    flex: 1,
  },
  eventMeta: {
    marginLeft: 4,
    fontSize: 13,
    color: "#666",
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
