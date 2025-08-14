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

export default function BuddySystemScreen({ navigation }: any) {
  const { user } = useAuth()
  const [matches, setMatches] = useState<BuddyMatch[]>([])
  const [requests, setRequests] = useState<BuddyRequest[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedBuddy, setSelectedBuddy] = useState<BuddyProfile | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"matches" | "requests" | "buddies">("matches")

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
    } catch (error) {
      console.error("Error loading buddy data:", error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buddy System</Text>
          <TouchableOpacity onPress={handleSafetyCheckIn}>
            <MaterialIcons name="security" size={24} color="white" />
          </TouchableOpacity>
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
          <Text style={[styles.tabText, activeTab === "buddies" && styles.activeTabText]}>My Buddies</Text>
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
          <View style={styles.emptyState}>
            <MaterialIcons name="group" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Buddies Yet</Text>
            <Text style={styles.emptyDescription}>Accept buddy requests to build your network</Text>
          </View>
        )}
      </View>

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
})
