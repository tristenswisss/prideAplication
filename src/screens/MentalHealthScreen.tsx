"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { LineChart } from "react-native-chart-kit"
import Slider from "@react-native-community/slider"
import {
  mentalHealthService,
  type MoodEntry,
  type MoodPattern,
  type Therapist,
} from "../../services/mentalHealthService"
import { useAuth } from "../../Contexts/AuthContexts"

const screenWidth = Dimensions.get("window").width

export default function MentalHealthScreen({ navigation }: any) {
  const { user } = useAuth()
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([])
  const [moodPattern, setMoodPattern] = useState<MoodPattern | null>(null)
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [currentMood, setCurrentMood] = useState(5)
  const [currentEnergy, setCurrentEnergy] = useState(5)
  const [currentAnxiety, setCurrentAnxiety] = useState(5)
  const [moodNotes, setMoodNotes] = useState("")
  const [activeTab, setActiveTab] = useState<"mood" | "resources" | "therapists">("mood")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadMentalHealthData()
    }
  }, [user])

  const loadMentalHealthData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [entries, pattern, therapistList] = await Promise.all([
        mentalHealthService.getMoodEntries(user.id, 30),
        mentalHealthService.analyzeMoodPatterns(user.id),
        mentalHealthService.findTherapists({ lgbtq_friendly: true }),
      ])
      setMoodEntries(entries)
      setMoodPattern(pattern)
      setTherapists(therapistList)
    } catch (error) {
      console.error("Error loading mental health data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogMood = async () => {
    if (!user) return

    try {
      const moodData = {
        user_id: user.id,
        mood: currentMood,
        energy: currentEnergy,
        anxiety: currentAnxiety,
        notes: moodNotes.trim() || undefined,
        activities: [], // Could be expanded to include activities
        triggers: [], // Could be expanded to include triggers
      }

      await mentalHealthService.logMood(moodData)
      Alert.alert("Mood Logged", "Your mood has been recorded successfully")
      setShowMoodModal(false)
      resetMoodForm()
      loadMentalHealthData()
    } catch (error) {
      Alert.alert("Error", "Failed to log mood")
    }
  }

  const resetMoodForm = () => {
    setCurrentMood(5)
    setCurrentEnergy(5)
    setCurrentAnxiety(5)
    setMoodNotes("")
  }

  const getMoodColor = (mood: number): string => {
    if (mood <= 3) return "#F44336"
    if (mood <= 5) return "#FF9800"
    if (mood <= 7) return "#FFC107"
    return "#4CAF50"
  }

  const getMoodEmoji = (mood: number): string => {
    if (mood <= 2) return "😢"
    if (mood <= 4) return "😕"
    if (mood <= 6) return "😐"
    if (mood <= 8) return "🙂"
    return "😊"
  }

  const getChartData = () => {
    if (moodEntries.length === 0) {
      return {
        labels: ["No data"],
        datasets: [{ data: [5] }],
      }
    }

    const last7Days = moodEntries.slice(0, 7).reverse()
    return {
      labels: last7Days.map((entry) => {
        const date = new Date(entry.created_at)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          data: last7Days.map((entry) => entry.mood),
          color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }
  }

  const renderTherapist = ({ item }: { item: Therapist }) => (
    <View style={styles.therapistCard}>
      <View style={styles.therapistHeader}>
        <View style={styles.therapistInfo}>
          <Text style={styles.therapistName}>{item.name}</Text>
          <Text style={styles.therapistCredentials}>{item.credentials.join(", ")}</Text>
          <View style={styles.therapistRating}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.priceRange}> • {item.price_range}</Text>
          </View>
        </View>
        <View style={styles.availabilityBadge}>
          <Text style={styles.availabilityText}>{item.availability.replace("_", " ")}</Text>
        </View>
      </View>

      <Text style={styles.therapistBio} numberOfLines={2}>
        {item.bio}
      </Text>

      <View style={styles.specialties}>
        {item.specialties.slice(0, 3).map((specialty, index) => (
          <View key={index} style={styles.specialtyTag}>
            <Text style={styles.specialtyText}>{specialty}</Text>
          </View>
        ))}
      </View>

      <View style={styles.therapistFooter}>
        <View style={styles.therapistFeatures}>
          {item.lgbtq_friendly && (
            <View style={styles.featureTag}>
              <MaterialIcons name="favorite" size={12} color="#FF6B6B" />
              <Text style={styles.featureText}>LGBTQ+ Friendly</Text>
            </View>
          )}
          {item.location.remote_available && (
            <View style={styles.featureTag}>
              <MaterialIcons name="videocam" size={12} color="#4CAF50" />
              <Text style={styles.featureText}>Remote</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.contactButton}>
          <Text style={styles.contactButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#9C27B0", "#673AB7"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mental Health</Text>
          <TouchableOpacity onPress={() => setShowMoodModal(true)}>
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Track your wellness journey</Text>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "mood" && styles.activeTab]}
          onPress={() => setActiveTab("mood")}
        >
          <Text style={[styles.tabText, activeTab === "mood" && styles.activeTabText]}>Mood Tracker</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "resources" && styles.activeTab]}
          onPress={() => setActiveTab("resources")}
        >
          <Text style={[styles.tabText, activeTab === "resources" && styles.activeTabText]}>Resources</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "therapists" && styles.activeTab]}
          onPress={() => setActiveTab("therapists")}
        >
          <Text style={[styles.tabText, activeTab === "therapists" && styles.activeTabText]}>Therapists</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === "mood" && (
          <>
            {/* Current Mood */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How are you feeling today?</Text>
              <TouchableOpacity style={styles.moodButton} onPress={() => setShowMoodModal(true)}>
                <Text style={styles.moodEmoji}>😊</Text>
                <Text style={styles.moodButtonText}>Log Your Mood</Text>
              </TouchableOpacity>
            </View>

            {/* Mood Chart */}
            {moodEntries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mood Trend (Last 7 Days)</Text>
                <View style={styles.chartContainer}>
                  <LineChart
                    data={getChartData()}
                    width={screenWidth - 40}
                    height={200}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: "6",
                        strokeWidth: "2",
                        stroke: "#FF6B6B",
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              </View>
            )}

            {/* Mood Insights */}
            {moodPattern && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <MaterialIcons
                      name={
                        moodPattern.moodTrend === "improving"
                          ? "trending-up"
                          : moodPattern.moodTrend === "declining"
                            ? "trending-down"
                            : "trending-flat"
                      }
                      size={24}
                      color={
                        moodPattern.moodTrend === "improving"
                          ? "#4CAF50"
                          : moodPattern.moodTrend === "declining"
                            ? "#F44336"
                            : "#FF9800"
                      }
                    />
                    <Text style={styles.insightTitle}>Average Mood: {moodPattern.averageMood}/10</Text>
                  </View>
                  {moodPattern.insights.map((insight, index) => (
                    <Text key={index} style={styles.insightText}>
                      • {insight}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Entries */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Entries</Text>
              {moodEntries.slice(0, 5).map((entry) => (
                <View key={entry.id} style={styles.moodEntryCard}>
                  <View style={styles.moodEntryHeader}>
                    <Text style={styles.moodEntryEmoji}>{getMoodEmoji(entry.mood)}</Text>
                    <View style={styles.moodEntryInfo}>
                      <Text style={styles.moodEntryMood}>Mood: {entry.mood}/10</Text>
                      <Text style={styles.moodEntryDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.moodIndicator, { backgroundColor: getMoodColor(entry.mood) }]} />
                  </View>
                  {entry.notes && <Text style={styles.moodEntryNotes}>{entry.notes}</Text>}
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === "resources" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mental Health Resources</Text>

            {/* Crisis Support */}
            <View style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <MaterialIcons name="phone" size={24} color="#F44336" />
                <Text style={styles.resourceTitle}>Crisis Support</Text>
              </View>
              <TouchableOpacity style={styles.hotlineButton}>
                <Text style={styles.hotlineText}>LGBTQ+ Crisis Hotline</Text>
                <Text style={styles.hotlineNumber}>1-866-488-7386</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.hotlineButton}>
                <Text style={styles.hotlineText}>Trans Lifeline</Text>
                <Text style={styles.hotlineNumber}>877-565-8860</Text>
              </TouchableOpacity>
            </View>

            {/* Self-Care Tips */}
            <View style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <MaterialIcons name="self-improvement" size={24} color="#4CAF50" />
                <Text style={styles.resourceTitle}>Self-Care Tips</Text>
              </View>
              <View style={styles.tipsList}>
                <Text style={styles.tipItem}>• Practice deep breathing for 5 minutes daily</Text>
                <Text style={styles.tipItem}>• Connect with supportive LGBTQ+ friends</Text>
                <Text style={styles.tipItem}>• Keep a gratitude journal</Text>
                <Text style={styles.tipItem}>• Engage in physical activity you enjoy</Text>
                <Text style={styles.tipItem}>• Set healthy boundaries</Text>
              </View>
            </View>

            {/* LGBTQ+ Resources */}
            <View style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <MaterialIcons name="favorite" size={24} color="#FF6B6B" />
                <Text style={styles.resourceTitle}>LGBTQ+ Support</Text>
              </View>
              <TouchableOpacity style={styles.resourceLink}>
                <Text style={styles.linkText}>The Trevor Project</Text>
                <MaterialIcons name="open-in-new" size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceLink}>
                <Text style={styles.linkText}>PFLAG Support Groups</Text>
                <MaterialIcons name="open-in-new" size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resourceLink}>
                <Text style={styles.linkText}>GLAAD Mental Health Resources</Text>
                <MaterialIcons name="open-in-new" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === "therapists" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LGBTQ+ Friendly Therapists</Text>
            <FlatList
              data={therapists}
              renderItem={renderTherapist}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="psychology" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Therapists Found</Text>
                  <Text style={styles.emptyDescription}>Try adjusting your search criteria</Text>
                </View>
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Mood Logging Modal */}
      <Modal visible={showMoodModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMoodModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Your Mood</Text>
            <TouchableOpacity onPress={handleLogMood}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Mood Slider */}
            <View style={styles.sliderSection}>
              <Text style={styles.sliderLabel}>
                Mood: {currentMood}/10 {getMoodEmoji(currentMood)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={currentMood}
                onValueChange={setCurrentMood}
                minimumTrackTintColor="#FF6B6B"
                maximumTrackTintColor="#ddd"
              />
            </View>

            {/* Energy Slider */}
            <View style={styles.sliderSection}>
              <Text style={styles.sliderLabel}>Energy Level: {currentEnergy}/10</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={currentEnergy}
                onValueChange={setCurrentEnergy}
                minimumTrackTintColor="#4CAF50"
                maximumTrackTintColor="#ddd"
              />
            </View>

            {/* Anxiety Slider */}
            <View style={styles.sliderSection}>
              <Text style={styles.sliderLabel}>Anxiety Level: {currentAnxiety}/10</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={currentAnxiety}
                onValueChange={setCurrentAnxiety}
                minimumTrackTintColor="#FF9800"
                maximumTrackTintColor="#ddd"
              />
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="How are you feeling? What's on your mind?"
                multiline
                numberOfLines={4}
                value={moodNotes}
                onChangeText={setMoodNotes}
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.modalNote}>💡 Regular mood tracking helps identify patterns and triggers</Text>
          </ScrollView>
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
    borderBottomColor: "#9C27B0",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#9C27B0",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  moodButton: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  moodEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  moodButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#9C27B0",
  },
  chartContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  insightCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  insightText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 5,
  },
  moodEntryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  moodEntryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodEntryEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  moodEntryInfo: {
    flex: 1,
  },
  moodEntryMood: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  moodEntryDate: {
    fontSize: 12,
    color: "#666",
  },
  moodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moodEntryNotes: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
    fontStyle: "italic",
  },
  resourceCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 10,
  },
  hotlineButton: {
    backgroundColor: "#FFF3E0",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  hotlineText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  hotlineNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF9800",
  },
  tipsList: {
    paddingLeft: 10,
  },
  tipItem: {
    fontSize: 14,
    color: "#666",
    lineHeight: 24,
    marginBottom: 5,
  },
  resourceLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  linkText: {
    fontSize: 16,
    color: "#9C27B0",
    fontWeight: "500",
  },
  therapistCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  therapistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  therapistCredentials: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  therapistRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 4,
  },
  priceRange: {
    fontSize: 14,
    color: "#666",
  },
  availabilityBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  therapistBio: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  specialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  specialtyTag: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 12,
    color: "#9C27B0",
    fontWeight: "500",
  },
  therapistFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  therapistFeatures: {
    flexDirection: "row",
    flex: 1,
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  featureText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  contactButton: {
    backgroundColor: "#9C27B0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  contactButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyState: {
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
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
  modalSave: {
    fontSize: 16,
    color: "#9C27B0",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  sliderSection: {
    marginBottom: 30,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalNote: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#F3E5F5",
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#9C27B0",
  },
})
