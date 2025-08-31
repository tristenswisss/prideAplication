"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { eventCreationService } from "../../services/eventCreationService"
import type { CreateEventScreenProps } from "../../types/navigation"
import { useTheme } from "../../Contexts/ThemeContext"

export default function CreateEventScreen({ navigation }: CreateEventScreenProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    category: "other" as const,
    tags: [] as string[],
    is_free: true,
    price: undefined as number | undefined,
    max_attendees: undefined as number | undefined,
    requires_approval: false,
    is_virtual: false,
    virtual_link: "",
    isTicketed: false,
  })
  const [virtualPlatform, setVirtualPlatform] = useState<"zoom" | "google_meet" | null>(null)

  // Date and time state
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)) // 2 hours later
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)

  const categories = [
    { id: "celebration", name: "Celebration", icon: "celebration" },
    { id: "networking", name: "Networking", icon: "people" },
    { id: "entertainment", name: "Entertainment", icon: "music-note" },
    { id: "education", name: "Education", icon: "school" },
    { id: "support", name: "Support", icon: "favorite" },
    { id: "other", name: "Other", icon: "more-horiz" },
  ]

  const availableTags = [
    "LGBTQ+",
    "Trans Friendly",
    "All Ages",
    "18+",
    "21+",
    "Wheelchair Accessible",
    "Free Food",
    "Networking",
    "Educational",
    "Social",
    "Outdoor",
    "Indoor",
  ]

  // Date picker handlers with proper null checking
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false)
    if (event && event.type === "set" && date) {
      setSelectedDate(date)
    }
  }

  const onStartTimeChange = (event: any, time?: Date) => {
    setShowStartTimePicker(false)
    if (event && event.type === "set" && time) {
      setStartTime(time)
    }
  }

  const onEndTimeChange = (event: any, time?: Date) => {
    setShowEndTimePicker(false)
    if (event && event.type === "set" && time) {
      setEndTime(time)
    }
  }

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Event title is required")
      return false
    }

    if (!formData.description.trim()) {
      Alert.alert("Error", "Event description is required")
      return false
    }

    if (!formData.location.trim() && !formData.is_virtual) {
      Alert.alert("Error", "Event location is required for in-person events")
      return false
    }

    if (formData.is_virtual && !formData.virtual_link.trim()) {
      Alert.alert("Error", "Virtual link is required for virtual events")
      return false
    }
    if (formData.is_virtual) {
      const link = formData.virtual_link.trim()
      const isZoom = /https?:\/\/.*zoom\.us\//i.test(link)
      const isMeet = /https?:\/\/meet\.google\.com\//i.test(link)
      if (!isZoom && !isMeet) {
        Alert.alert("Error", "Only Zoom or Google Meet links are allowed")
        return false
      }
      if (!virtualPlatform) {
        Alert.alert("Error", "Please select Zoom or Google Meet")
        return false
      }
    }

    if (!formData.is_free && (!formData.price || formData.price <= 0)) {
      Alert.alert("Error", "Price is required for paid events")
      return false
    }

    if (formData.max_attendees && formData.max_attendees <= 0) {
      Alert.alert("Error", "Maximum attendees must be greater than 0")
      return false
    }

    if (startTime >= endTime) {
      Alert.alert("Error", "End time must be after start time")
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create an event")
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      // Format date and time strings
      const eventDate = selectedDate.toISOString().split("T")[0]
      const startTimeString = startTime.toTimeString().split(" ")[0]
      const endTimeString = endTime.toTimeString().split(" ")[0]

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: eventDate,
        start_time: startTimeString,
        end_time: endTimeString,
        location: formData.is_virtual ? `Virtual (${virtualPlatform === "zoom" ? "Zoom" : "Google Meet"})` : formData.location.trim(),
        organizer_id: user.id,
        category: formData.category,
        tags: formData.tags,
        is_free: formData.is_free,
        price: formData.is_free ? undefined : formData.price,
        max_attendees: formData.max_attendees,
        requires_approval: formData.requires_approval,
        isVirtual: formData.is_virtual,
        virtual_link: formData.is_virtual ? formData.virtual_link.trim() : undefined,
        isTicketed: formData.isTicketed,
      }

      console.log("Creating event with data:", eventData)

      const result = await eventCreationService.createEvent(eventData)

      if (result.success && result.event) {
        Alert.alert("Success", "Event created successfully!", [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack()
              // Optionally navigate to the event details
              // navigation.navigate("EventDetails", { event: result.event })
            },
          },
        ])
      } else {
        Alert.alert("Error", result.error || "Failed to create event")
      }
    } catch (error: any) {
      console.error("Error creating event:", error)
      Alert.alert("Error", error.message || "Failed to create event")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.colors.surface + '40' }]}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Create Event</Text>
          <TouchableOpacity onPress={handleSubmit} style={[styles.createButton, { backgroundColor: theme.colors.surface + '40' }]} disabled={loading}>
            <Text style={[styles.createButtonText, { color: theme.colors.headerText }]}>{loading ? "Creating..." : "Create"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Event Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              placeholderTextColor={theme.colors.placeholder}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              placeholder="Describe your event..."
              placeholderTextColor={theme.colors.placeholder}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, formData.category === category.id && [styles.selectedCategory, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]]}
                  onPress={() => setFormData((prev) => ({ ...prev, category: category.id as any }))}
                >
                  <MaterialIcons
                    name={category.icon as any}
                    size={20}
                    color={formData.category === category.id ? theme.colors.surface : theme.colors.textSecondary}
                  />
                  <Text style={[styles.categoryText, { color: theme.colors.textSecondary }, formData.category === category.id && [styles.selectedCategoryText, { color: theme.colors.surface }]]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Date and Time */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date & Time</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Event Date</Text>
            <TouchableOpacity style={[styles.dateButton, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="event" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.dateButtonText, { color: theme.colors.inputText }]}>{selectedDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeInputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Start Time</Text>
              <TouchableOpacity style={[styles.timeButton, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]} onPress={() => setShowStartTimePicker(true)}>
                <MaterialIcons name="access-time" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.timeButtonText, { color: theme.colors.inputText }]}>
                  {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeInputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>End Time</Text>
              <TouchableOpacity style={[styles.timeButton, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]} onPress={() => setShowEndTimePicker(true)}>
                <MaterialIcons name="access-time" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.timeButtonText, { color: theme.colors.inputText }]}>
                  {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Location</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Virtual Event</Text>
            <Switch
              value={formData.is_virtual}
              onValueChange={(value) => { setFormData((prev) => ({ ...prev, is_virtual: value })); if (!value) { setVirtualPlatform(null) } }}
              trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
              thumbColor={formData.is_virtual ? theme.colors.accent : theme.colors.surface }
            />
          </View>

          {formData.is_virtual ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Platform *</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.categoryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, virtualPlatform === "zoom" && [styles.selectedCategory, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]]}
                    onPress={() => setVirtualPlatform("zoom")}
                  >
                    <MaterialIcons name="videocam" size={20} color={virtualPlatform === "zoom" ? theme.colors.surface : theme.colors.textSecondary} />
                    <Text style={[styles.categoryText, { color: theme.colors.textSecondary }, virtualPlatform === "zoom" && [styles.selectedCategoryText, { color: theme.colors.surface }]]}>Zoom</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.categoryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, virtualPlatform === "google_meet" && [styles.selectedCategory, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]]}
                    onPress={() => setVirtualPlatform("google_meet")}
                  >
                    <MaterialIcons name="video-call" size={20} color={virtualPlatform === "google_meet" ? theme.colors.surface : theme.colors.textSecondary} />
                    <Text style={[styles.categoryText, { color: theme.colors.textSecondary }, virtualPlatform === "google_meet" && [styles.selectedCategoryText, { color: theme.colors.surface }]]}>Google Meet</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Meeting Link *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
                  value={formData.virtual_link}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, virtual_link: text }))}
                  placeholder="Paste Zoom or Google Meet link"
                  placeholderTextColor={theme.colors.placeholder}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Venue Address *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
                value={formData.location}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                placeholder="Enter venue address"
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
          )}
        </View>

        {/* Pricing */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pricing</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Free Event</Text>
            <Switch
              value={formData.is_free}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, is_free: value, price: value ? undefined : prev.price }))
              }
              trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
              thumbColor={formData.is_free ? theme.colors.accent : theme.colors.surface}
            />
          </View>

          {!formData.is_free && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Ticket Price *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
                value={formData.price?.toString() || ""}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, price: text ? Number.parseFloat(text) : undefined }))
                }
                placeholder="Enter ticket price"
                placeholderTextColor={theme.colors.placeholder}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Ticketed Event</Text>
            <Switch
              value={formData.isTicketed}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, isTicketed: value }))}
              trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
              thumbColor={formData.isTicketed ? theme.colors.accent : theme.colors.surface}
            />
          </View>
        </View>

        {/* Event Settings */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Event Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Maximum Attendees (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.inputText }]}
              value={formData.max_attendees?.toString() || ""}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, max_attendees: text ? Number.parseInt(text) : undefined }))
              }
              placeholder="Leave blank for unlimited"
              placeholderTextColor={theme.colors.placeholder}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Require Approval to Join</Text>
            <Switch
              value={formData.requires_approval}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, requires_approval: value }))}
              trackColor={{ false: theme.colors.textTertiary, true: theme.colors.primary }}
              thumbColor={formData.requires_approval ? theme.colors.accent : theme.colors.surface}
            />
          </View>
        </View>

        {/* Tags */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tags</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Select tags that describe your event</Text>
          <View style={styles.tagsContainer}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, formData.tags.includes(tag) && [styles.selectedTag, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagText, { color: theme.colors.textSecondary }, formData.tags.includes(tag) && [styles.selectedTagText, { color: theme.colors.surface }]]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Date Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker value={startTime} mode="time" display="default" onChange={onStartTimeChange} />
      )}

      {showEndTimePicker && <DateTimePicker value={endTime} mode="time" display="default" onChange={onEndTimeChange} />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    textAlign: "center",
    marginHorizontal: 20,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoriesContainer: {
    marginTop: 10,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedCategory: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  selectedCategoryText: {
    color: "white",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeInputGroup: {
    flex: 0.48,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  timeButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  tagButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedTag: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  tagText: {
    fontSize: 14,
    color: "#666",
  },
  selectedTagText: {
    color: "white",
  },
})
