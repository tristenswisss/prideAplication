"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import type { PrivacySafetyScreenProps } from "../../types/navigation"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface PrivacySettings {
  profileVisibility: "public" | "friends" | "private"
  showLocation: boolean
  showOnlineStatus: boolean
  allowDirectMessages: "everyone" | "friends" | "nobody"
  showInSearch: boolean
  dataCollection: boolean
  analyticsOptOut: boolean
  locationTracking: boolean
  twoFactorAuth: boolean
  loginAlerts: boolean
}

export default function PrivacySafetyScreen({ navigation }: PrivacySafetyScreenProps) {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: "public",
    showLocation: true,
    showOnlineStatus: true,
    allowDirectMessages: "everyone",
    showInSearch: true,
    dataCollection: false,
    analyticsOptOut: false,
    locationTracking: true,
    twoFactorAuth: false,
    loginAlerts: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load settings from storage
      const savedSettings = await AsyncStorage.getItem("privacySettings")
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error("Error loading privacy settings:", error)
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      // Save to storage and API
      await AsyncStorage.setItem("privacySettings", JSON.stringify(settings))
      // await api.updatePrivacySettings(settings)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      Alert.alert("Success", "Privacy settings updated!")
    } catch (error) {
      Alert.alert("Error", "Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  const toggleSetting = (key: keyof PrivacySettings) => {
    if (key === "profileVisibility" || key === "allowDirectMessages") return // Handle separately

    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const updateProfileVisibility = (value: PrivacySettings["profileVisibility"]) => {
    setSettings((prev) => ({ ...prev, profileVisibility: value }))
  }

  const updateDirectMessages = (value: PrivacySettings["allowDirectMessages"]) => {
    setSettings((prev) => ({ ...prev, allowDirectMessages: value }))
  }

  const handleBlockedUsers = () => {
    Alert.alert("Blocked Users", "This feature will show your blocked users list")
  }

  const handleDataDownload = () => {
    Alert.alert("Download Data", "We'll prepare your data for download and email you when ready")
  }

  const handleAccountDeletion = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Account Deletion", "Please contact support to delete your account")
          },
        },
      ],
    )
  }

  const renderToggleOption = (key: keyof PrivacySettings, title: string, description: string, icon: string) => (
    <TouchableOpacity style={styles.option} onPress={() => toggleSetting(key)}>
      <View style={styles.optionIcon}>
        <MaterialIcons name={icon as any} size={24} color="black" />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <View style={[styles.toggle, settings[key] && styles.toggleActive]}>
        <View style={[styles.toggleThumb, settings[key] && styles.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  )

  const renderSelectOption = <T extends string>(
    title: string,
    description: string,
    icon: string,
    options: { label: string; value: T }[],
    currentValue: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={styles.selectOption}>
      <View style={styles.optionHeader}>
        <View style={styles.optionIcon}>
          <MaterialIcons name={icon as any} size={24} color="black" />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.selectButtons}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.selectButton, currentValue === option.value && styles.selectedButton]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.selectButtonText, currentValue === option.value && styles.selectedButtonText]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Safety</Text>
          <TouchableOpacity onPress={saveSettings} style={styles.saveButton} disabled={loading}>
            <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Privacy</Text>

          {renderSelectOption(
            "Profile Visibility",
            "Who can see your profile information",
            "visibility",
            [
              { label: "Public", value: "public" },
              { label: "Friends", value: "friends" },
              { label: "Private", value: "private" },
            ],
            settings.profileVisibility,
            updateProfileVisibility,
          )}

          {renderToggleOption("showLocation", "Show Location", "Display your location on your profile", "location-on")}

          {renderToggleOption("showOnlineStatus", "Show Online Status", "Let others see when you're online", "circle")}

          {renderToggleOption(
            "showInSearch",
            "Appear in Search",
            "Allow others to find you in search results",
            "search",
          )}
        </View>

        {/* Communication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication</Text>

          {renderSelectOption(
            "Direct Messages",
            "Who can send you direct messages",
            "message",
            [
              { label: "Everyone", value: "everyone" },
              { label: "Friends", value: "friends" },
              { label: "Nobody", value: "nobody" },
            ],
            settings.allowDirectMessages,
            updateDirectMessages,
          )}

          <TouchableOpacity style={styles.actionOption} onPress={handleBlockedUsers}>
            <View style={styles.optionIcon}>
              <MaterialIcons name="block" size={24} color="black" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Blocked Users</Text>
              <Text style={styles.optionDescription}>Manage your blocked users list</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          {renderToggleOption(
            "dataCollection",
            "Data Collection",
            "Allow collection of usage data for app improvement",
            "analytics",
          )}

          {renderToggleOption(
            "analyticsOptOut",
            "Analytics Opt-out",
            "Opt out of analytics and tracking",
            "trending-down",
          )}

          {renderToggleOption(
            "locationTracking",
            "Location Tracking",
            "Allow location tracking for nearby recommendations",
            "my-location",
          )}

          <TouchableOpacity style={styles.actionOption} onPress={handleDataDownload}>
            <View style={styles.optionIcon}>
              <MaterialIcons name="download" size={24} color="black" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Download My Data</Text>
              <Text style={styles.optionDescription}>Get a copy of your data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          {renderToggleOption(
            "twoFactorAuth",
            "Two-Factor Authentication",
            "Add an extra layer of security to your account",
            "security",
          )}

          {renderToggleOption(
            "loginAlerts",
            "Login Alerts",
            "Get notified of new login attempts",
            "notification-important",
          )}
        </View>

        {/* Safety Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Actions</Text>

          <TouchableOpacity style={styles.actionOption} onPress={() => navigation.navigate("Safety")}>
            <View style={styles.optionIcon}>
              <MaterialIcons name="shield" size={24} color="black" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Safety Center</Text>
              <Text style={styles.optionDescription}>Access safety features and emergency contacts</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionOption} onPress={() => navigation.navigate("BuddySystem")}>
            <View style={styles.optionIcon}>
              <MaterialIcons name="people" size={24} color="black" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Buddy System</Text>
              <Text style={styles.optionDescription}>Manage your safety buddy connections</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.dangerOption} onPress={handleAccountDeletion}>
            <View style={styles.optionIcon}>
              <MaterialIcons name="delete-forever" size={24} color="black" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.dangerText]}>Delete Account</Text>
              <Text style={styles.optionDescription}>Permanently delete your account and data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
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
  saveButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    marginBottom: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dangerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  selectOption: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  optionIcon: {
    width: 40,
    alignItems: "center",
  },
  optionContent: {
    flex: 1,
    marginLeft: 15,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  dangerText: {
    color: "#F44336",
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ddd",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "black",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  selectButtons: {
    flexDirection: "row",
    gap: 10,
  },
  selectButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "black",
    borderColor: "black",
  },
  selectButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  selectedButtonText: {
    color: "white",
  },
})
