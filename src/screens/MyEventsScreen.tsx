"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import type { Event } from "../../types"
import type { MyEventsScreenProps } from "../../types/navigation"

interface UserEvent extends Event {
  rsvpStatus: "going" | "interested" | "not_going"
  rsvpDate: string
}

export default function MyEventsScreen({ navigation }: MyEventsScreenProps) {
  const [events, setEvents] = useState<UserEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"upcoming" | "past" | "going" | "interested">("upcoming")

  useEffect(() => {
    loadMyEvents()
  }, [])

  const loadMyEvents = async () => {
    try {
      setLoading(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockEvents: UserEvent[] = [
        {
          id: "1",
          title: "Pride Month Celebration",
          description: "Join us for a month-long celebration of Pride with various activities and events.",
          date: "2024-06-15T18:00:00Z",
          start_time: "18:00",
          end_time: "22:00",
          location: "Castro District, San Francisco",
          latitude: 37.7749,
          longitude: -122.4194,
          category: "celebration",
          organizer: {
            id: "org1",
            email: "info@sfpride.org",
            name: "SF Pride Committee",
            verified: true,
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2020-01-01T00:00:00Z"
          },
          attendee_count: 1500,
          max_attendees: 2000,
          is_free: true,
          tags: ["pride", "celebration", "community"],
          image_url: "",
          organizer_id: "org1",
          rsvpStatus: "going",
          rsvpDate: "2024-05-20T10:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        },
        {
          id: "2",
          title: "LGBTQ+ Business Networking",
          description: "Connect with other LGBTQ+ business owners and entrepreneurs.",
          date: "2024-02-10T19:00:00Z",
          start_time: "19:00",
          end_time: "21:00",
          location: "Downtown Conference Center",
          latitude: 37.7849,
          longitude: -122.4094,
          category: "networking",
          organizer: {
            id: "org2",
            email: "info@pridebusiness.org",
            name: "Pride Business Alliance",
            verified: true,
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2020-01-01T00:00:00Z"
          },
          attendee_count: 75,
          max_attendees: 100,
          is_free: false,
          price: 25,
          tags: ["business", "networking", "professional"],
          image_url: "",
          organizer_id: "org2",
          rsvpStatus: "interested",
          rsvpDate: "2024-01-15T14:30:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        },
      ]

      setEvents(mockEvents)
    } catch (error) {
      Alert.alert("Error", "Failed to load your events")
    } finally {
      setLoading(false)
    }
  }

  const updateRSVP = (eventId: string, newStatus: UserEvent["rsvpStatus"]) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, rsvpStatus: newStatus, rsvpDate: new Date().toISOString() } : event,
      ),
    )
  }

  const removeEvent = (eventId: string) => {
    Alert.alert("Remove Event", "Are you sure you want to remove this event from your list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setEvents((prev) => prev.filter((event) => event.id !== eventId))
        },
      },
    ])
  }

  const getFilteredEvents = () => {
    const now = new Date()
    return events.filter((event) => {
      const eventDate = new Date(event.date)

      switch (filter) {
        case "upcoming":
          return eventDate > now
        case "past":
          return eventDate < now
        case "going":
          return event.rsvpStatus === "going"
        case "interested":
          return event.rsvpStatus === "interested"
        default:
          return true
      }
    })
  }

  const renderEvent = ({ item }: { item: UserEvent }) => {
    const eventDate = new Date(item.date)
    const isUpcoming = eventDate > new Date()

    return (
      <TouchableOpacity style={styles.eventCard} onPress={() => navigation.navigate("Events", { screen: "EventDetails", params: { event: item } })}>
        <View style={styles.eventImageContainer}>
          <View style={styles.placeholderImage}>
            <MaterialIcons name="event" size={40} color="#ccc" />
          </View>
          <View style={[styles.statusBadge, styles[`${item.rsvpStatus}Badge`]]}>
            <Text style={styles.statusText}>
              {item.rsvpStatus === "going" ? "Going" : item.rsvpStatus === "interested" ? "Interested" : "Not Going"}
            </Text>
          </View>
        </View>

        <View style={styles.eventInfo}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <TouchableOpacity onPress={() => removeEvent(item.id)} style={styles.removeButton}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.metaText}>
                {eventDate.toLocaleDateString()} at{" "}
                {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="people" size={16} color="#666" />
              <Text style={styles.metaText}>{item.attendee_count} attending</Text>
            </View>
          </View>

          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>

          {isUpcoming && (
            <View style={styles.rsvpContainer}>
              <Text style={styles.rsvpLabel}>RSVP Status:</Text>
              <View style={styles.rsvpButtons}>
                {(["going", "interested", "not_going"] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.rsvpButton, item.rsvpStatus === status && styles.activeRsvpButton]}
                    onPress={() => updateRSVP(item.id, status)}
                  >
                    <Text style={[styles.rsvpButtonText, item.rsvpStatus === status && styles.activeRsvpButtonText]}>
                      {status === "going" ? "Going" : status === "interested" ? "Interested" : "Not Going"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.rsvpDate}>RSVP'd on {new Date(item.rsvpDate).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const filteredEvents = getFilteredEvents()

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Events</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(["upcoming", "past", "going", "interested"] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[styles.filterTab, filter === filterOption && styles.activeFilterTab]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[styles.filterTabText, filter === filterOption && styles.activeFilterTabText]}>
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="event-note" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Events Found</Text>
          <Text style={styles.emptyDescription}>
            {filter === "upcoming"
              ? "You don't have any upcoming events."
              : filter === "past"
                ? "You haven't attended any events yet."
                : filter === "going"
                  ? "You're not going to any events yet."
                  : "You haven't shown interest in any events yet."}
          </Text>
          <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate("Events", { screen: "EventsMain" })}>
            <Text style={styles.exploreButtonText}>Explore Events</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 20,
  },
  activeFilterTab: {
    backgroundColor: "#FF6B6B",
  },
  filterTabText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  activeFilterTabText: {
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImageContainer: {
    position: "relative",
  },
  placeholderImage: {
    height: 120,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  goingBadge: {
    backgroundColor: "#4CAF50",
  },
  interestedBadge: {
    backgroundColor: "#FF9800",
  },
  not_goingBadge: {
    backgroundColor: "#F44336",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  eventInfo: {
    padding: 15,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  removeButton: {
    padding: 4,
  },
  eventMeta: {
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  eventDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  rsvpContainer: {
    marginBottom: 10,
  },
  rsvpLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  rsvpButtons: {
    flexDirection: "row",
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  activeRsvpButton: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  rsvpButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  activeRsvpButtonText: {
    color: "white",
  },
  rsvpDate: {
    fontSize: 12,
    color: "#999",
  },
})
