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
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { eventCreationService } from "../../services/eventCreationService"
import type { CreateEventScreenProps } from "../../types/navigation"

export default function CreateEventScreen({ navigation }: CreateEventScreenProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date(),
    endDate: new Date(),
    location: "",
    category: "",
    isVirtual: false,
    isTicketed: false,
    ticketPrice: 0,
    maxAttendees: 100,
    tags: [] as string[],
  })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tagInput, setTagInput] = useState("")

  const categories = eventCreationService.getEventCategories()
  const popularTags = eventCreationService.getPopularTags()

  const handleCreateEvent = async () => {
    const validation = eventCreationService.validateEventData({
      ...formData,
      date: formData.date.toISOString(),
      endDate: formData.endDate.toISOString(),
    })

    if (!validation.isValid) {
      Alert.alert("Validation Error", validation.errors.join("\n"))
      return
    }

    setLoading(true)
    try {
      await eventCreationService.createEvent({
        ...formData,
        date: formData.date.toISOString(),
        endDate: formData.endDate.toISOString(),
      })

      Alert.alert("Success", "Event created successfully!", [{ text: "OK", onPress: () => navigation.goBack() }])
    } catch (error) {
      Alert.alert("Error", "Failed to create event. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag.trim().toLowerCase()],
      }))
    }
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const renderCategoryOption = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[styles.categoryOption, formData.category === category && styles.selectedCategoryOption]}
      onPress={() => setFormData((prev) => ({ ...prev, category }))}
    >
      <Text style={[styles.categoryOptionText, formData.category === category && styles.selectedCategoryOptionText]}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
    </TouchableOpacity>
  )

  const renderPopularTag = (tag: string) => (
    <TouchableOpacity
      key={tag}
      style={[styles.popularTag, formData.tags.includes(tag) && styles.selectedPopularTag]}
      onPress={() => (formData.tags.includes(tag) ? removeTag(tag) : addTag(tag))}
    >
      <Text style={[styles.popularTagText, formData.tags.includes(tag) && styles.selectedPopularTagText]}>#{tag}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <TouchableOpacity onPress={handleCreateEvent} style={styles.createButton} disabled={loading}>
            <Text style={styles.createButtonText}>{loading ? "Creating..." : "Create"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
              placeholder="Enter event title"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              placeholder="Describe your event..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.sectionTitle}>Category *</Text>
            <View style={styles.categoryContainer}>{categories.map(renderCategoryOption)}</View>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Date & Time *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <MaterialIcons name="event" size={20} color="#666" />
              <Text style={styles.dateButtonText}>
                {formData.date.toLocaleDateString()} at{" "}
                {formData.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Date & Time</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
              <MaterialIcons name="event" size={20} color="#666" />
              <Text style={styles.dateButtonText}>
                {formData.endDate.toLocaleDateString()} at{" "}
                {formData.endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Virtual Event</Text>
            <Switch
              value={formData.isVirtual}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, isVirtual: value }))}
              trackColor={{ false: "#ddd", true: "#FF6B6B" }}
              thumbColor="white"
            />
          </View>

          {!formData.isVirtual && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Venue/Address *</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                placeholder="Enter venue name or address"
              />
            </View>
          )}

          {formData.isVirtual && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Virtual Meeting Link</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
                placeholder="Zoom, Google Meet, or other platform link"
                keyboardType="url"
              />
            </View>
          )}
        </View>

        {/* Ticketing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticketing</Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Ticketed Event</Text>
            <Switch
              value={formData.isTicketed}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, isTicketed: value }))}
              trackColor={{ false: "#ddd", true: "#FF6B6B" }}
              thumbColor="white"
            />
          </View>

          {formData.isTicketed && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ticket Price ($)</Text>
              <TextInput
                style={styles.input}
                value={formData.ticketPrice.toString()}
                onChangeText={(text) =>
                  setFormData((prev) => ({
                    ...prev,
                    ticketPrice: Number.parseFloat(text) || 0,
                  }))
                }
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Maximum Attendees</Text>
            <TextInput
              style={styles.input}
              value={formData.maxAttendees.toString()}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  maxAttendees: Number.parseInt(text) || 100,
                }))
              }
              placeholder="100"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <Text style={styles.sectionSubtitle}>Help people discover your event</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Add Custom Tag</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Enter tag and press +"
                onSubmitEditing={() => addTag(tagInput)}
              />
              <TouchableOpacity style={styles.addTagButton} onPress={() => addTag(tagInput)}>
                <MaterialIcons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.inputLabel}>Popular Tags</Text>
          <View style={styles.popularTagsContainer}>{popularTags.map(renderPopularTag)}</View>

          {formData.tags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              <Text style={styles.inputLabel}>Selected Tags</Text>
              <View style={styles.selectedTags}>
                {formData.tags.map((tag) => (
                  <View key={tag} style={styles.selectedTag}>
                    <Text style={styles.selectedTagText}>#{tag}</Text>
                    <TouchableOpacity onPress={() => removeTag(tag)}>
                      <MaterialIcons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false)
            if (selectedDate) {
              setFormData((prev) => ({ ...prev, date: selectedDate }))
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.endDate}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false)
            if (selectedDate) {
              setFormData((prev) => ({ ...prev, endDate: selectedDate }))
            }
          }}
          minimumDate={formData.date}
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
    marginHorizontal: 20,
  },
  createButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  categoryOption: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedCategoryOption: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  selectedCategoryOptionText: {
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
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tagInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
    marginRight: 10,
  },
  addTagButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    padding: 12,
  },
  popularTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  popularTag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedPopularTag: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  popularTagText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  selectedPopularTagText: {
    color: "white",
  },
  selectedTagsContainer: {
    marginTop: 15,
  },
  selectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  selectedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagText: {
    fontSize: 12,
    color: "white",
    fontWeight: "600",
    marginRight: 6,
  },
})
