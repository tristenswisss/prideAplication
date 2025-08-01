"use client"

import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react"
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert, SafeAreaView, Linking } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { eventService, notificationService } from "../../services/eventService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { EventDetailsScreenProps } from "../../types/navigation"

export default function EventDetailsScreen({ route, navigation }: EventDetailsScreenProps) {
  const { event } = route.params
  const { user } = useAuth()
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "interested" | "not_going" | null>(null)
  const [attendeeCount, setAttendeeCount] = useState(event.attendee_count)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadRSVPStatus()
    }
  }, [user])

  const loadRSVPStatus = async () => {
    if (!user) return
    try {
      const status = await eventService.getUserRSVPStatus(event.id, user.id)
      setRsvpStatus(status)
    } catch (error) {
      console.error("Error loading RSVP status:", error)
    }
  }

  const handleRSVP = async (status: "going" | "interested" | "not_going") => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to RSVP to events")
      return
    }

    setLoading(true)
    try {
      await eventService.rsvpToEvent(event.id, user.id, status)

      // Update local state
      const previousStatus = rsvpStatus
      setRsvpStatus(status === "not_going" ? null : status)

      // Update attendee count
      if (status === "going" && previousStatus !== "going") {
        setAttendeeCount(attendeeCount + 1)
      } else if (status !== "going" && previousStatus === "going") {
        setAttendeeCount(Math.max(0, attendeeCount - 1))
      }

      // Create notification for event reminder
      if (status === "going") {
        await notificationService.createNotification({
          user_id: user.id,
          title: "Event RSVP Confirmed! 🎉",
          message: `You're going to ${event.title}`,
          type: "event_reminder",
          data: { event_id: event.id },
          read: false,
        })
      }

      const statusText = status === "not_going" ? "removed your RSVP" : `marked as ${status}`
      Alert.alert("RSVP Updated", `You've ${statusText} for this event!`)
    } catch (error) {
      console.error("Error updating RSVP:", error)
      Alert.alert("Error", "Failed to update RSVP")
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      // In a real app, you'd use the Share API
      Alert.alert("Share Event", `Check out this event: ${event.title}`)
    } catch (error) {
      Alert.alert("Error", "Failed to share event")
    }
  }

  const handleGetDirections = () => {
    if (event.latitude && event.longitude) {
      const url = `https://maps.google.com/?q=${event.latitude},${event.longitude}`
      Linking.openURL(url)
    } else {
      const url = `https://maps.google.com/?q=${encodeURIComponent(event.location)}`
      Linking.openURL(url)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const isEventFull = event.max_attendees && attendeeCount >= event.max_attendees

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={styles.headerImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialIcons name="event" size={80} color="#ccc" />
            </View>
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.imageOverlay}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <MaterialIcons name="share" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Event Content */}
        <View style={styles.content}>
          <View style={styles.eventHeader}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.priceContainer}>
              {event.is_free ? (
                <Text style={styles.freePrice}>FREE</Text>
              ) : (
                <Text style={styles.price}>${event.price}</Text>
              )}
            </View>
          </View>

          {/* Date and Time */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <MaterialIcons name="event" size={24} color="gold" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(event.date)}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="access-time" size={24} color="gold" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Time</Text>
                <Text style={styles.infoValue}>
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="location-on" size={24} color="gold" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Location</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <MaterialIcons name="people" size={24} color="gold" />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Attendees</Text>
                <Text style={styles.infoValue}>
                  {attendeeCount} going
                  {event.max_attendees && ` • ${event.max_attendees} max`}
                  {isEventFull && " • FULL"}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tags}>
              {event.tags.map((tag: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, index: Key | null | undefined) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Organizer */}
          {event.organizer && (
            <View style={styles.organizerSection}>
              <Text style={styles.sectionTitle}>Organizer</Text>
              <View style={styles.organizerCard}>
                <Image source={{ uri: event.organizer.avatar_url }} style={styles.organizerAvatar} />
                <View style={styles.organizerInfo}>
                  <View style={styles.organizerName}>
                    <Text style={styles.organizerNameText}>{event.organizer.name}</Text>
                    {event.organizer.verified && <MaterialIcons name="verified" size={16} color="#4CAF50" />}
                  </View>
                  <Text style={styles.organizerEmail}>{event.organizer.email}</Text>
                </View>
              </View>
            </View>
          )}

          {/* RSVP Status */}
          {rsvpStatus && (
            <View style={styles.rsvpStatusSection}>
              <View style={styles.rsvpStatusCard}>
                <MaterialIcons name={rsvpStatus === "going" ? "check-circle" : "star"} size={24} color="#4CAF50" />
                <Text style={styles.rsvpStatusText}>
                  You're {rsvpStatus === "going" ? "going to" : "interested in"} this event!
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
          <MaterialIcons name="directions" size={20} color="#4ECDC4" />
          <Text style={styles.directionsButtonText}>Directions</Text>
        </TouchableOpacity>
<View style={styles.rsvpButtons}>
  <TouchableOpacity
    style={[
      styles.rsvpButton,
      rsvpStatus === "going" ? styles.activeRSVP : undefined,
      isEventFull && rsvpStatus !== "going" ? styles.disabledButton : undefined,
    ]}
    onPress={() => handleRSVP("going")}
    disabled={!!loading || (!!isEventFull && rsvpStatus !== "going")}
  >
    <Text
      style={[
        styles.rsvpButtonText,
        rsvpStatus === "going" ? styles.activeRSVPText : undefined,
      ]}
    >
      {isEventFull && rsvpStatus !== "going" ? "Full" : "Going"}
    </Text>
  </TouchableOpacity>
</View>


          <TouchableOpacity
            style={[styles.rsvpButton, rsvpStatus === "interested" && styles.activeRSVP]}
            onPress={() => handleRSVP("interested")}
            disabled={loading}
          >
            <Text style={[styles.rsvpButtonText, rsvpStatus === "interested" && styles.activeRSVPText]}>
              Interested
            </Text>
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageContainer: {
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f0f0f0",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 50,
  },
  placeholderImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 15,
    lineHeight: 34,
  },
  priceContainer: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  freePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  infoSection: {
    marginBottom: 25,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  infoText: {
    marginLeft: 15,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  descriptionSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  tagsSection: {
    marginBottom: 25,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: "#666",
  },
  organizerSection: {
    marginBottom: 25,
  },
  organizerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
  },
  organizerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ddd",
  },
  organizerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  organizerName: {
    flexDirection: "row",
    alignItems: "center",
  },
  organizerNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginRight: 5,
  },
  organizerEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  rsvpStatusSection: {
    marginBottom: 25,
  },
  rsvpStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    padding: 15,
    borderRadius: 10,
  },
  rsvpStatusText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 10,
  },
  bottomActions: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginRight: 15,
  },
  directionsButtonText: {
    fontSize: 16,
    color: "#4ECDC4",
    fontWeight: "600",
    marginLeft: 5,
  },
  rsvpButtons: {
    flexDirection: "row",
    flex: 1,
  },
  rsvpButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginLeft: 10,
  },
  activeRSVP: {
    backgroundColor: "#FF6B6B",
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
    opacity: 0.6,
  },
  rsvpButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  activeRSVPText: {
    color: "white",
  },
})
