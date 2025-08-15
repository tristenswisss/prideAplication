"use client"


import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  TextInput,
  Modal,
  FlatList,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import {
  buddySystemService,
  type BuddyMatch,
  type BuddyRequest,
  type BuddyProfile,
} from "../../services/buddySystemService"
import { useAuth } from "../../Contexts/AuthContexts"
import { profileService } from "../../services/profileService"
import { messagingService } from "../../services/messagingService"
import { userReportService } from "../../services/userReportService"
import type { UserProfile } from "../../types"

export default function BuddySystemScreen({ navigation }: any) {
  const { user } = useAuth()
  const [matches, setMatches] = useState<BuddyMatch[]>([])
  const [requests, setRequests] = useState<BuddyRequest[]>([])
  const [buddies, setBuddies] = useState<BuddyMatch[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedBuddy, setSelectedBuddy] = useState<BuddyProfile | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"matches" | "requests" | "buddies">("matches")
  const [showFindModal, setShowFindModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (user) {
      loadBuddyData()
    }
  }, [user])

  const loadBuddyData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [matchesData, requestsData] = await Promise.all([
        buddySystemService.getBuddyMatches(user.id),
        buddySystemService.getBuddyRequests(user.id),
      ])
      setMatches(matchesData)
      setRequests(requestsData)
      setBuddies(matchesData) // accepted matches
    } catch (error) {
      console.error("Error loading buddy data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Search users to add buddies
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!user || !searchQuery.trim()) {
        setSearchResults([])
        return
      }
      try {
        setSearching(true)
        const result = await profileService.searchUsers(searchQuery.trim(), user.id)
        if (result.success && result.data) {
          setSearchResults(result.data)
        }
      } catch (e) {
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, user?.id])

  const handleSendRequest = async () => {
    if (!user || !selectedBuddy || !requestMessage.trim()) {
      Alert.alert("Error", "Please enter a message")
      return
    }

    try {
      await buddySystemService.sendBuddyRequest(user.id, selectedBuddy.id, requestMessage)
      Alert.alert("Request Sent", "Your buddy request has been sent!")
      setShowRequestModal(false)
      setRequestMessage("")
      setSelectedBuddy(null)
      loadBuddyData()
    } catch (error) {
      Alert.alert("Error", "Failed to send buddy request")
    }
  }

  const handleStartChat = async (target: UserProfile) => {
    if (!user) return
    try {
      const conversation = await messagingService.createConversation([target.id])
      setShowFindModal(false)
      navigation.navigate("Chat", { conversation })
    } catch (e) {
      Alert.alert("Error", "Failed to start chat")
    }
  }

  const handleBlockUser = async (target: UserProfile) => {
    if (!user) return
    const ok = await messagingService.blockUser(user.id, target.id)
    Alert.alert(ok ? "Blocked" : "Error", ok ? "User has been blocked" : "Failed to block user")
  }

  const handleReportUser = async (target: UserProfile) => {
    if (!user) return
    const res = await userReportService.submitReport({
      reporter_id: user.id,
      reported_user_id: target.id,
      reason: "abuse",
    })
    Alert.alert(res.success ? "Reported" : "Error", res.success ? "Report submitted" : res.error || "Failed")
  }

  const handleUnfriend = async (targetUserId: string) => {
    if (!user) return
    const res = await buddySystemService.unfriendBuddy(user.id, targetUserId)
    if (res.success) {
      setBuddies((prev) => prev.filter((m) => !(m.user1_id === targetUserId || m.user2_id === targetUserId)))
      Alert.alert("Removed", "User has been removed from your buddies")
    } else {
      Alert.alert("Error", res.error || "Failed to remove buddy")
    }
  }

  const handleRespondToRequest = async (requestId: string, response: "accepted" | "rejected") => {
    try {
      await buddySystemService.respondToBuddyRequest(requestId, response)
      Alert.alert(
        response === "accepted" ? "Request Accepted" : "Request Declined",
        response === "accepted" ? "You now have a new buddy!" : "Request has been declined",
      )
      loadBuddyData()
    } catch (error) {
      Alert.alert("Error", "Failed to respond to request")
    }
  }

  const handleSafetyCheckIn = async () => {
    if (!user) return

    Alert.alert("Safety Check-in", "How are you feeling?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "I'm Safe",
        onPress: async () => {
          try {
            await buddySystemService.performSafetyCheckIn(
              user.id,
              "buddy123", // In real app, this would be the actual buddy ID
              { latitude: 37.7749, longitude: -122.4194 },
              "safe",
            )
            Alert.alert("Check-in Complete", "Your safety status has been recorded")
          } catch (error) {
            Alert.alert("Error", "Failed to complete check-in")
          }
        },
      },
      {
        text: "Need Help",
        style: "destructive",
        onPress: async () => {
          try {
            await buddySystemService.performSafetyCheckIn(
              user.id,
              "buddy123",
              { latitude: 37.7749, longitude: -122.4194 },
              "need_help",
              "Need assistance",
            )
            Alert.alert("Help Alert Sent", "Your buddy and emergency contacts have been notified")
          } catch (error) {
            Alert.alert("Error", "Failed to send help alert")
          }
        },
      },
    ])
  }

  const openRequestModal = async (matchId: string) => {
    try {
      // In real app, get buddy profile from match
      const buddyProfile = await buddySystemService.getBuddyProfile("user2")
      setSelectedBuddy(buddyProfile)
      setShowRequestModal(true)
    } catch (error) {
      Alert.alert("Error", "Failed to load buddy profile")
    }
  }

  const renderMatch = ({ item }: { item: BuddyMatch }) => (
    <View style={styles.matchCard}>
      <Image source={{ uri: "/placeholder.svg?height=80&width=80&text=User" }} style={styles.matchAvatar} />
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>Potential Buddy</Text>
        <Text style={styles.matchCompatibility}>{item.compatibility_score}% Compatible</Text>
        <Text style={styles.matchDistance}>{item.distance} miles away</Text>
        <View style={styles.matchInterests}>
          {item.matched_interests.slice(0, 2).map((interest, index) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.connectButton} onPress={() => openRequestModal(item.id)}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  )

  const renderRequest = ({ item }: { item: BuddyRequest }) => (
    <View style={styles.requestCard}>
      <Image source={{ uri: "/placeholder.svg?height=60&width=60&text=User" }} style={styles.requestAvatar} />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>Buddy Request</Text>
        <Text style={styles.requestMessage}>{item.message}</Text>
        <Text style={styles.requestTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      {item.status === "pending" && item.to_user_id === user?.id && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.requestActionButton, styles.acceptButton]}
            onPress={() => handleRespondToRequest(item.id, "accepted")}
          >
            <MaterialIcons name="check" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestActionButton, styles.rejectButton]}
            onPress={() => handleRespondToRequest(item.id, "rejected")}
          >
            <MaterialIcons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
      {item.status !== "pending" && (
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: item.status === "accepted" ? "#020303ff" : "black" }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  )

  const renderBuddy = ({ item }: { item: BuddyMatch }) => {
    const otherId = item.user1_id === user?.id ? item.user2_id : item.user1_id
    const otherName = item.user1_id === user?.id ? item.user2?.name : item.user1?.name
    const otherAvatar = item.user1_id === user?.id ? item.user2?.avatar_url : item.user1?.avatar_url
    return (
      <View style={styles.matchCard}>
        <Image source={{ uri: otherAvatar || "/placeholder.svg?height=80&width=80&text=U" }} style={styles.matchAvatar} />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{otherName || "Buddy"}</Text>
          <Text style={styles.matchCompatibility}>Connected</Text>
        </View>
        <TouchableOpacity style={styles.connectButton} onPress={() => handleUnfriend(otherId)}>
          <Text style={styles.connectButtonText}>Unfriend</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buddy System</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={() => setShowFindModal(true)} style={{ marginRight: 12 }}>
              <MaterialIcons name="person-add" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSafetyCheckIn}>
              <MaterialIcons name="security" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Find safe companions for your adventures</Text>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "matches" && styles.activeTab]}
          onPress={() => setActiveTab("matches")}
        >
          <Text style={[styles.tabText, activeTab === "matches" && styles.activeTabText]}>
            Matches ({matches.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <Text style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}>
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "buddies" && styles.activeTab]}
          onPress={() => setActiveTab("buddies")}
        >
          <Text style={[styles.tabText, activeTab === "buddies" && styles.activeTabText]}>My Buddies ({buddies.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "matches" && (
          <FlatList
            data={matches}
            renderItem={renderMatch}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="people" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Matches Yet</Text>
                <Text style={styles.emptyDescription}>Complete your profile to find compatible buddies</Text>
              </View>
            }
          />
        )}

        {activeTab === "requests" && (
          <FlatList
            data={requests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="mail" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Requests</Text>
                <Text style={styles.emptyDescription}>Buddy requests will appear here</Text>
              </View>
            }
          />
        )}

        {activeTab === "buddies" && (
          <FlatList
            data={buddies}
            renderItem={renderBuddy}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialIcons name="group" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>No Buddies Yet</Text>
                <Text style={styles.emptyDescription}>Accept buddy requests to build your network</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Find Buddy Modal */}
      <Modal visible={showFindModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFindModal(false)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Find Buddies</Text>
            <View style={{ width: 60 }} />
          </View>

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
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.searchResultItem}>
                <Image source={{ uri: item.avatar_url || "/placeholder.svg?height=50&width=50&text=U" }} style={styles.searchAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchUserName}>{item.name}</Text>
                  <Text style={styles.searchUserHandle}>@{item.username || item.name.toLowerCase().replace(/\s+/g, "")}</Text>
                </View>
                <TouchableOpacity style={styles.smallAction} onPress={() => handleStartChat(item)}>
                  <MaterialIcons name="chat" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallAction, { backgroundColor: "#FF6B6B" }]}
                  onPress={() => {
                    setSelectedBuddy({
                      id: item.id,
                      email: item.email,
                      name: item.name,
                      avatar_url: item.avatar_url,
                      bio: item.bio,
                      pronouns: item.pronouns,
                      interests: item.interests || [],
                      verified: item.verified,
                      follower_count: item.follower_count || 0,
                      following_count: item.following_count || 0,
                      post_count: item.post_count || 0,
                      safetyRating: 5,
                      buddyPreferences: { ageRange: [18, 100], interests: [], meetupTypes: [], maxDistance: 50 },
                      verificationStatus: "verified",
                      lastActive: item.updated_at,
                      responseRate: 100,
                      meetupCount: 0,
                      created_at: item.created_at,
                      updated_at: item.updated_at,
                    })
                    setShowRequestModal(true)
                  }}
                >
                  <MaterialIcons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallAction, { backgroundColor: "#333" }]} onPress={() => handleBlockUser(item)}>
                  <MaterialIcons name="block" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallAction, { backgroundColor: "#555" }]} onPress={() => handleReportUser(item)}>
                  <MaterialIcons name="flag" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyDescription}>{searching ? "Searching..." : "No users found"}</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Safety Check-in Button */}
      <TouchableOpacity style={styles.safetyButton} onPress={handleSafetyCheckIn}>
        <MaterialIcons name="security" size={24} color="white" />
        <Text style={styles.safetyButtonText}>Safety Check-in</Text>
      </TouchableOpacity>

      {/* Request Modal */}
      <Modal visible={showRequestModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Send Buddy Request</Text>
            <TouchableOpacity onPress={handleSendRequest}>
              <Text style={styles.modalSend}>Send</Text>
            </TouchableOpacity>
          </View>

          {selectedBuddy && (
            <View style={styles.modalContent}>
              <View style={styles.buddyPreview}>
                <Image
                  source={{ uri: selectedBuddy.avatar_url || "/placeholder.svg?height=80&width=80&text=User" }}
                  style={styles.buddyAvatar}
                />
                <View style={styles.buddyInfo}>
                  <Text style={styles.buddyName}>{selectedBuddy.name}</Text>
                  <Text style={styles.buddyBio}>{selectedBuddy.bio}</Text>
                  <View style={styles.buddyStats}>
                    <Text style={styles.buddyStat}>⭐ {selectedBuddy.safetyRating}</Text>
                    <Text style={styles.buddyStat}>📍 {selectedBuddy.location?.city}</Text>
                    <Text style={styles.buddyStat}>🤝 {selectedBuddy.meetupCount} meetups</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.messageLabel}>Message</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Hi! I'd love to be your buddy and explore safe spaces together..."
                multiline
                numberOfLines={4}
                value={requestMessage}
                onChangeText={setRequestMessage}
                textAlignVertical="top"
              />

              <Text style={styles.safetyNote}>
                💡 Remember: Always meet in public places and let someone know your plans
              </Text>
            </View>
          )}
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
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "black",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "black",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  matchCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  matchAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  matchCompatibility: {
    fontSize: 14,
    color: "gold",
    fontWeight: "600",
    marginBottom: 2,
  },
  matchDistance: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  matchInterests: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  interestTag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 10,
    color: "#1976D2",
    fontWeight: "500",
  },
  connectButton: {
    backgroundColor: "black",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  connectButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  requestMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: "#999",
  },
  requestActions: {
    flexDirection: "row",
  },
  requestActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: "black",
  },
  rejectButton: {
    backgroundColor: "black",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  safetyButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  safetyButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
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
  modalSend: {
    fontSize: 16,
    color: "black",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  buddyPreview: {
    flexDirection: "row",
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  buddyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  buddyInfo: {
    flex: 1,
  },
  buddyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  buddyBio: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  buddyStats: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  buddyStat: {
    fontSize: 12,
    color: "#666",
    marginRight: 15,
    marginBottom: 4,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  safetyNote: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#FFF3E0",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "gold",
  },
  smallAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#4ECDC4",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  searchUserName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  searchUserHandle: {
    fontSize: 13,
    color: "#666",
  },
})
