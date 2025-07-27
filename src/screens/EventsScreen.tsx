"use client"

import { useState, useEffect } from "react"
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, FlatList, Image, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { eventService } from "../../services/eventService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { Event } from "../../types"
import type { EventsScreenProps } from "../../types/navigation"

export default function EventsScreen({ navigation }: EventsScreenProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const categories = [
    { id: "all", name: "All Events", icon: "event", color: "#FF6B6B" },
    { id: "celebration", name: "Celebrations", icon: "celebration", color: "#4ECDC4" },
    { id: "networking", name: "Networking", icon: "people", color: "#45B7D1" },
    { id: "entertainment", name: "Entertainment", icon: "local-play", color: "#96CEB4" },
    { id: "education", name: "Education", icon: "school", color: "#FFEAA7" },
    { id: "support", name: "Support", icon: "favorite", color: "#DDA0DD" },
  ]

  useEffect(() => {
    loadEvents()
  }, [selectedCategory])

  const loadEvents = async () => {
    try {
      setLoading(true)
      let data: Event[]
      if (selectedCategory === "all") {
        data = await eventService.getUpcomingEvents()
      } else {
        data = await eventService.getEventsByCategory(selectedCategory)
      }
      setEvents(data)
    } catch (error) {
      console.error("Error loading events:", error)
      Alert.alert("Error", "Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    }
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`)
    return time.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === item.id && { backgroundColor: item.color }]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <MaterialIcons name={item.icon as any} size={16} color={selectedCategory === item.id ? "white" : item.color} />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && { color: "white" },
          selectedCategory !== item.id && { color: item.color },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  )

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => navigation.navigate("EventDetails", { event: item })}>
      <Image source={{ uri: item.image_url }} style={styles.eventImage} />

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDate}>
            <Text style={styles.eventDateText}>{formatDate(item.date)}</Text>
            <Text style={styles.eventTimeText}>{formatTime(item.start_time)}</Text>
          </View>
          <View style={styles.eventPrice}>
            {item.is_free ? (
              <Text style={styles.freeText}>FREE</Text>
            ) : (
              <Text style={styles.priceText}>${item.price}</Text>
            )}
          </View>
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.eventLocation}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.eventFooter}>
          <View style={styles.attendeeInfo}>
            <MaterialIcons name="people" size={16} color="#666" />
            <Text style={styles.attendeeText}>
              {item.attendee_count} going
              {item.max_attendees && ` • ${item.max_attendees} max`}
            </Text>
          </View>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.eventTags}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Events</Text>
            <Text style={styles.headerSubtitle}>Discover Pride community events</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Alert.alert("Notifications", "Notification center coming soon!")}
          >
            <MaterialIcons name="notifications" size={24} color="white" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Category Filter */}
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      />

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        style={styles.eventsList}
        contentContainerStyle={styles.eventsListContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadEvents}
      />

      {/* Create Event Button */}
      <TouchableOpacity
        style={styles.createEventButton}
        onPress={() => Alert.alert("Coming Soon", "Event creation will be available soon")}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
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
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
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
  eventImage: {
    width: "100%",
    height: 150,
    backgroundColor: "#f0f0f0",
  },
  eventContent: {
    padding: 15,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  eventDate: {
    alignItems: "flex-start",
  },
  eventDateText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF6B6B",
  },
  eventTimeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  eventPrice: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  priceText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    lineHeight: 24,
  },
  eventLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  attendeeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendeeText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  categoryBadge: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: "white",
    fontWeight: "bold",
  },
  eventTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#666",
  },
  createEventButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#FF6B6B",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
})
