"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  RefreshControl,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { safeSpacesService, type CrisisContact } from "../../services/safeSpacesService"

interface SafetyScreenProps {
  navigation: any
}

export default function SafetyScreen({ navigation }: SafetyScreenProps) {
  const [crisisContacts, setCrisisContacts] = useState<CrisisContact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string>("")

  useEffect(() => {
    loadCrisisContacts()
    loadAdminEmail()
  }, [])

  const loadCrisisContacts = async () => {
    try {
      const response = await safeSpacesService.getCrisisContacts("Zimbabwe")
      if (response.success && response.data) {
        setCrisisContacts(response.data)
      }
    } catch (error) {
      console.error("Error loading crisis contacts:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminEmail = async () => {
    // In a real app, you'd fetch this from your app settings
    setAdminEmail("admin@miraeapp.com")
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadCrisisContacts()
    setRefreshing(false)
  }

  const handleCall = (phone: string) => {
    Alert.alert("Make Call", `Do you want to call ${phone}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => Linking.openURL(`tel:${phone}`),
      },
    ])
  }

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`)
  }

  const handleWebsite = (website: string) => {
    Linking.openURL(website)
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      mental_health: "psychology",
      health: "local-hospital",
      youth: "child-care",
      domestic_violence: "shield",
      emergency: "emergency",
      other: "help",
    }
    return icons[category] || "help"
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      mental_health: "#4CAF50",
      health: "#2196F3",
      youth: "#FF9800",
      domestic_violence: "#F44336",
      emergency: "#FF5722",
      other: "#9C27B0",
    }
    return colors[category] || "#9C27B0"
  }

  const renderCrisisContact = (contact: CrisisContact) => (
    <View key={contact.id} style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(contact.category) }]}>
          <MaterialIcons name={getCategoryIcon(contact.category) as any} size={24} color="white" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactDescription}>{contact.description}</Text>
          <Text style={styles.contactHours}>Available: {contact.available_hours}</Text>
        </View>
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={() => handleCall(contact.phone)}>
          <MaterialIcons name="phone" size={20} color="white" />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        {contact.email && (
          <TouchableOpacity
            style={[styles.actionButton, styles.emailButton]}
            onPress={() => handleEmail(contact.email!)}
          >
            <MaterialIcons name="email" size={20} color="white" />
            <Text style={styles.actionButtonText}>Email</Text>
          </TouchableOpacity>
        )}

        {contact.website && (
          <TouchableOpacity
            style={[styles.actionButton, styles.websiteButton]}
            onPress={() => handleWebsite(contact.website!)}
          >
            <MaterialIcons name="language" size={20} color="white" />
            <Text style={styles.actionButtonText}>Website</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.contactDetails}>
        <Text style={styles.contactPhone}>📞 {contact.phone}</Text>
        <Text style={styles.contactLanguages}>🗣️ Languages: {contact.languages.join(", ")}</Text>
        <Text style={styles.contactServices}>🛠️ Services: {contact.services.join(", ")}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#FF6B6B", "#FF8E53"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Safety Center</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Emergency Notice */}
        <View style={styles.emergencyNotice}>
          <MaterialIcons name="warning" size={24} color="#FF5722" />
          <Text style={styles.emergencyText}>
            If you are in immediate danger, please contact local emergency services or call 999 in Zimbabwe.
          </Text>
        </View>

        {/* Admin Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Support</Text>
          <View style={styles.adminCard}>
            <MaterialIcons name="support-agent" size={24} color="#2196F3" />
            <View style={styles.adminInfo}>
              <Text style={styles.adminTitle}>Mirae Support Team</Text>
              <Text style={styles.adminDescription}>For app-related issues, feedback, or general support</Text>
            </View>
            <TouchableOpacity style={styles.adminButton} onPress={() => handleEmail(adminEmail)}>
              <MaterialIcons name="email" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Crisis Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crisis Support Contacts</Text>
          <Text style={styles.sectionSubtitle}>Professional support services available in Zimbabwe</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading crisis contacts...</Text>
            </View>
          ) : crisisContacts.length > 0 ? (
            crisisContacts.map(renderCrisisContact)
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="info" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No crisis contacts available</Text>
            </View>
          )}
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <MaterialIcons name="location-on" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Share your location with trusted friends when meeting new people</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcons name="people" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Meet in public places for first-time meetings</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcons name="phone" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Keep emergency contacts easily accessible</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialIcons name="security" size={20} color="#4CAF50" />
              <Text style={styles.tipText}>Trust your instincts and leave if you feel unsafe</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emergencyNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#FF5722",
  },
  emergencyText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#E65100",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 20,
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
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  adminInfo: {
    flex: 1,
    marginLeft: 15,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  adminDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  adminButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 20,
  },
  contactCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  contactHours: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  contactActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: "center",
  },
  callButton: {
    backgroundColor: "#4CAF50",
  },
  emailButton: {
    backgroundColor: "#2196F3",
  },
  websiteButton: {
    backgroundColor: "#FF9800",
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  contactDetails: {
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    paddingTop: 15,
  },
  contactPhone: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  contactLanguages: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  contactServices: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 10,
  },
  tipsContainer: {
    marginTop: 10,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 10,
    lineHeight: 20,
  },
})
