"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, Image, TextInput } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { eventService } from "../../services/eventService"
import { liveEventService } from "../../services/liveEventService"
import type { Event } from "../../types"
import type { EventsScreenProps } from "../../types/navigation"
import { useAuth } from "../../Contexts/AuthContexts"

export default function EventsScreen({ navigation }: EventsScreenProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "today" | "this_week">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const createLiveEventFlow = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to start a live event")
      return
    }

    try {
      const newLiveEvent = await liveEventService.createLiveEvent(
        undefined,
        user.id,
        "Live Event",
        "Join me for a live stream!",
      )
      navigation.navigate("LiveEvent", { liveEvent: newLiveEvent })
    } catch (error) {
      console.error("Error starting live event:", error)
      Alert.alert("Error", "Failed to start live event")
    }
  }

  const handleLiveEventAction = () => {
    Alert.alert("Live Event", "What would you like to do?", [
      { text: "Join", onPress: () => navigation.navigate("LiveEvents" as any) },
      { text: "Create", onPress: createLiveEventFlow },
      { text: "Cancel", style: "cancel" },
    ])
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await eventService.getAllEvents()
      setEvents(data)
    } catch (error) {
      console.error("Error loading events:", error)
      Alert.alert("Error", "Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  const getFilteredEvents = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const lower = searchQuery.trim().toLowerCase()

    return events.filter((event) => {
      const eventDate = new Date(event.date)

      switch (filter) {
        case "upcoming":
          return eventDate > now
        case "today":
          return eventDate >= today && eventDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        case "this_week":
          return eventDate > now && eventDate <= weekFromNow
        default:
          return true
      }
    }).filter((ev) => {
      if (!lower) return true
      const category = (ev.category || "").toString().toLowerCase()
      const title = (ev.title || "").toLowerCase()
      const desc = (ev.description || "").toLowerCase()
      const location = (ev.location || "").toLowerCase()
      const tags = Array.isArray(ev.tags) ? ev.tags.join(" ").toLowerCase() : ""
      return (
        category.includes(lower) ||
        title.includes(lower) ||
        desc.includes(lower) ||
        location.includes(lower) ||
        tags.includes(lower)
      )
    })
  }

  const renderEvent = ({ item }: { item: Event }) => {
    const eventDate = new Date(item.date)
    const isUpcoming = eventDate > new Date()

    return (
      <TouchableOpacity style={styles.eventCard} onPress={() => navigation.navigate("EventDetails", { event: item })}>
        <View style={styles.eventImageContainer}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.eventImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialIcons name="event" size={40} color="#ccc" />
            </View>
          )}
          {!item.is_free && item.price && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{item.price === 0 ? "Free" : `$${item.price}`}</Text>
            </View>
          )}
        </View>

        <View style={styles.eventInfo}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <View style={styles.attendeeCount}>
              <MaterialIcons name="people" size={16} color="#666" />
              <Text style={styles.attendeeText}>{item.attendee_count || item.current_attendees || 0}</Text>
            </View>
          </View>

          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.metaText}>
                {eventDate.toLocaleDateString()} at {item.time || item.start_time}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="person" size={16} color="#666" />
              <Text style={styles.metaText}>by {item.organizer?.name || "Unknown"}</Text>
            </View>
          </View>

          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.eventTags}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category.toUpperCase()}</Text>
            </View>
            {item.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          {isUpcoming && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.interestedButton}>
                <MaterialIcons name="star-border" size={16} color="#FF6B6B" />
                <Text style={styles.interestedButtonText}>Interested</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.goingButton}>
                <MaterialIcons name="check" size={16} color="white" />
                <Text style={styles.goingButtonText}>Going</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const filteredEvents = getFilteredEvents()

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSubtitle}>Discover LGBTQ+ community events</Text>
        </View>

        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by category, name, or location"
            placeholderTextColor="#bbb"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.liveEventButton} onPress={handleLiveEventAction}>
            <MaterialIcons name="videocam" size={24} color="white" />
            <Text style={styles.liveEventButtonText}>Live Event</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateEvent") }>
            <MaterialIcons name="add" size={24} color="white" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(["all", "upcoming", "today", "this_week"] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[styles.filterTab, filter === filterOption && styles.activeFilterTab]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[styles.filterTabText, filter === filterOption && styles.activeFilterTabText]}>
              {filterOption === "all"
                ? "All"
                : filterOption === "upcoming"
                  ? "Upcoming"
                  : filterOption === "today"
                    ? "Today"
                    : "This Week"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="event-note" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Events Found</Text>
          <Text style={styles.emptyDescription}>
            {filter === "all"
              ? "No events available at the moment."
              : filter === "today"
                ? "No events happening today."
                : filter === "this_week"
                  ? "No events this week."
                  : "No upcoming events found."}
          </Text>
          <TouchableOpacity style={styles.createEventButton} onPress={() => navigation.navigate("CreateEvent")}>
            <Text style={styles.createEventButtonText}>Create First Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadEvents}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "grey",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  searchBar: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "white",
  },
  headerContent: {
    marginBottom: 20,
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
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  headerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  liveEventButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  liveEventButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  activeFilterTab: {
    backgroundColor: "black",
  },
  filterTabText: {
    fontSize: 13,
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
  createEventButton: {
    backgroundColor: "black",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createEventButtonText: {
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
    marginBottom: 20,
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
    height: 150,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  eventImage: {
    height: 150,
    width: "100%",
  },
  priceBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "gold",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  priceText: {
    fontSize: 12,
    color: "white",
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
  attendeeCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendeeText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
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
  eventTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  categoryTag: {
    backgroundColor: "black",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryTagText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  interestedButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "black",
  },
  interestedButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "black",
    fontWeight: "600",
  },
  goingButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "black",
  },
  goingButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
})
