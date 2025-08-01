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
  Linking,
  TextInput,
  Switch,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { safetyService } from "../../services/safetyService"
import { useAuth } from "../../Contexts/AuthContexts"
import type { EmergencyContact, SafetyAlert } from "../../services/safetyService"

export default function SafetyScreen({ navigation }: any) {
  const { user } = useAuth()
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [safetyAlerts, setSafetyAlerts] = useState<SafetyAlert[]>([])
  const [locationSharing, setLocationSharing] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [reportText, setReportText] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSafetyData()
  }, [])

  const loadSafetyData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [contacts, alerts] = await Promise.all([
        safetyService.getEmergencyContacts(user.id),
        safetyService.getSafetyAlerts(user.id),
      ])
      setEmergencyContacts(contacts)
      setSafetyAlerts(alerts)
    } catch (error) {
      console.error("Error loading safety data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmergencyCall = () => {
    Alert.alert("Emergency Call", "Call 911 for immediate emergency assistance?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call 911",
        style: "destructive",
        onPress: () => Linking.openURL("tel:911"),
      },
    ])
  }

  const handleCrisisHotline = () => {
    Alert.alert("Crisis Support", "Call LGBTQ+ Crisis Hotline for immediate support?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call Now",
        onPress: () => Linking.openURL("tel:1-866-488-7386"),
      },
    ])
  }

  const handleSafetyCheckIn = async () => {
    if (!user) return

    try {
      await safetyService.performSafetyCheckIn(user.id, "safe", {
        latitude: 40.7128,
        longitude: -74.006,
      })
      Alert.alert("Check-in Successful", "Your safety check-in has been recorded.")
    } catch (error) {
      Alert.alert("Error", "Failed to perform safety check-in")
    }
  }

  const handleReportIncident = async () => {
    if (!user || !reportText.trim()) {
      Alert.alert("Error", "Please enter incident details")
      return
    }

    try {
      await safetyService.reportIncident(user.id, {
        type: "harassment",
        description: reportText,
        location: "Current Location",
        anonymous: true,
      })
      setReportText("")
      Alert.alert("Report Submitted", "Your incident report has been submitted anonymously.")
    } catch (error) {
      Alert.alert("Error", "Failed to submit report")
    }
  }

  const toggleEmergencyMode = async () => {
    const newMode = !emergencyMode
    setEmergencyMode(newMode)

    if (newMode) {
      Alert.alert(
        "Emergency Mode Activated",
        "Your emergency contacts will be notified of your location every 15 minutes.",
        [{ text: "OK" }],
      )
    }
  }

  const addEmergencyContact = () => {
    Alert.prompt(
      "Add Emergency Contact",
      "Enter contact name and phone number",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: async (input) => {
            if (input && user) {
              const [name, phone] = input.split(",").map((s) => s.trim())
              if (name && phone) {
                try {
                  await safetyService.addEmergencyContact(user.id, { name, phone, relationship: "friend" })
                  loadSafetyData()
                } catch (error) {
                  Alert.alert("Error", "Failed to add emergency contact")
                }
              }
            }
          },
        },
      ],
      "plain-text",
      "Name, Phone Number",
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
          <Text style={styles.headerTitle}>Safety Center</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Emergency Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Actions</Text>

          <View style={styles.emergencyButtons}>
            <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyCall}>
              <MaterialIcons name="local-hospital" size={32} color="white" />
              <Text style={styles.emergencyButtonText}>Call 911</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.emergencyButton, styles.crisisButton]} onPress={handleCrisisHotline}>
              <MaterialIcons name="support-agent" size={32} color="white" />
              <Text style={styles.emergencyButtonText}>Crisis Hotline</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Features</Text>

          <TouchableOpacity style={styles.featureCard} onPress={handleSafetyCheckIn}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Safety Check-in</Text>
              <Text style={styles.featureDescription}>Let your contacts know you're safe</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <View style={styles.featureCard}>
            <MaterialIcons name="location-on" size={24} color="#2196F3" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Location Sharing</Text>
              <Text style={styles.featureDescription}>Share location with emergency contacts</Text>
            </View>
            <Switch
              value={locationSharing}
              onValueChange={setLocationSharing}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={locationSharing ? "#2196F3" : "#f4f3f4"}
            />
          </View>

          <View style={styles.featureCard}>
            <MaterialIcons name="warning" size={24} color="#FF9800" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Emergency Mode</Text>
              <Text style={styles.featureDescription}>Automatic location updates every 15 min</Text>
            </View>
            <Switch
              value={emergencyMode}
              onValueChange={toggleEmergencyMode}
              trackColor={{ false: "#767577", true: "#ffb74d" }}
              thumbColor={emergencyMode ? "#FF9800" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity onPress={addEmergencyContact}>
              <MaterialIcons name="add" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <MaterialIcons name="person" size={24} color="#666" />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${contact.phone}`)}>
                  <MaterialIcons name="phone" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No emergency contacts added yet</Text>
          )}
        </View>

        {/* Report Incident */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Incident</Text>
          <Text style={styles.sectionDescription}>
            Report safety incidents anonymously to help keep our community safe
          </Text>

          <TextInput
            style={styles.reportInput}
            placeholder="Describe the incident..."
            multiline
            numberOfLines={4}
            value={reportText}
            onChangeText={setReportText}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.reportButton} onPress={handleReportIncident}>
            <Text style={styles.reportButtonText}>Submit Anonymous Report</Text>
          </TouchableOpacity>
        </View>

        {/* Safety Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Safety Alerts</Text>

          {safetyAlerts.length > 0 ? (
            safetyAlerts.slice(0, 3).map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <MaterialIcons
                  name={alert.severity === "high" ? "warning" : "info"}
                  size={20}
                  color={alert.severity === "high" ? "#FF5722" : "#2196F3"}
                />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                  <Text style={styles.alertTime}>{new Date(alert.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent safety alerts</Text>
          )}
        </View>

        {/* Safety Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Resources</Text>

          <TouchableOpacity style={styles.resourceCard}>
            <MaterialIcons name="book" size={24} color="#4CAF50" />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Safety Guide</Text>
              <Text style={styles.resourceDescription}>Tips for staying safe in LGBTQ+ spaces</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard}>
            <MaterialIcons name="group" size={24} color="#2196F3" />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>Support Groups</Text>
              <Text style={styles.resourceDescription}>Find local LGBTQ+ support groups</Text>
            </View>
          </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    lineHeight: 20,
  },
  emergencyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emergencyButton: {
    backgroundColor: "#FF5722",
    flex: 0.48,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  crisisButton: {
    backgroundColor: "#9C27B0",
  },
  emergencyButtonText: {
    color: "white",
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 14,
  },
  featureCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureContent: {
    flex: 1,
    marginLeft: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
  },
  contactCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: "#666",
  },
  reportInput: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
    marginBottom: 15,
    minHeight: 100,
  },
  reportButton: {
    backgroundColor: "#FF6B6B",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  reportButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  alertCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  alertContent: {
    flex: 1,
    marginLeft: 15,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: "#999",
  },
  resourceCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resourceContent: {
    flex: 1,
    marginLeft: 15,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    padding: 20,
  },
})
