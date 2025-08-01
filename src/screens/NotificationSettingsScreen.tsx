"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import type { NotificationSettingsScreenProps } from "../../types/navigation"

interface NotificationSettings {
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  eventReminders: boolean
  newEvents: boolean
  nearbyEvents: boolean
  businessUpdates: boolean
  communityMessages: boolean
  safetyAlerts: boolean
  buddySystemNotifications: boolean
  mentalHealthReminders: boolean
  weeklyDigest: boolean
  marketingEmails: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  quietHours: {
    enabled: boolean
    startTime: string
    endTime: string
  }
}

export default function NotificationSettingsScreen({ navigation }: NotificationSettingsScreenProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    eventReminders: true,
    newEvents: true,
    nearbyEvents: true,
    businessUpdates: false,
    communityMessages: true,
    safetyAlerts: true,
    buddySystemNotifications: true,
    mentalHealthReminders: true,
    weeklyDigest: true,
    marketingEmails: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: {
      enabled: false,
      startTime: "22:00",
      endTime: "08:00",
    },
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load settings from storage
      // const savedSettings = await AsyncStorage.getItem('notificationSettings')
      // if (savedSettings) {
      //   setSettings(JSON.parse(savedSettings))
      // }
    } catch (error) {
      console.error("Error loading notification settings:", error)
    }
  }

  const saveSettings = async () => {
    try {
      setLoading(true)
      // Save to storage and API
      // await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings))
      // await api.updateNotificationSettings(settings)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      Alert.alert("Success", "Notification settings updated!")
    } catch (error) {
      Alert.alert("Error", "Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  const toggleSetting = (key: keyof NotificationSettings) => {
    if (key === "quietHours") return // Handle separately

    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleQuietHours = () => {
    setSettings((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: !prev.quietHours.enabled,
      },
    }))
  }

  const renderToggleOption = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string,
    disabled = false,
  ) => (
    <TouchableOpacity
      style={[styles.option, disabled && styles.disabledOption]}
      onPress={() => !disabled && toggleSetting(key)}
      disabled={disabled}
    >
      <View style={styles.optionIcon}>
        <MaterialIcons name={icon as any} size={24} color={disabled ? "#ccc" : "black"} />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionTitle, disabled && styles.disabledText]}>{title}</Text>
        <Text style={[styles.optionDescription, disabled && styles.disabledText]}>{description}</Text>
      </View>
      <View style={[styles.toggle, settings[key] && styles.toggleActive, disabled && styles.disabledToggle]}>
        <View style={[styles.toggleThumb, settings[key] && styles.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={saveSettings} style={styles.saveButton} disabled={loading}>
            <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          {renderToggleOption(
            "pushNotifications",
            "Push Notifications",
            "Receive notifications on your device",
            "notifications",
          )}

          {renderToggleOption("emailNotifications", "Email Notifications", "Receive notifications via email", "email")}

          {renderToggleOption(
            "smsNotifications",
            "SMS Notifications",
            "Receive important alerts via text message",
            "sms",
          )}
        </View>

        {/* Event Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events</Text>

          {renderToggleOption(
            "eventReminders",
            "Event Reminders",
            "Get reminded about events you're attending",
            "event",
            !settings.pushNotifications,
          )}

          {renderToggleOption(
            "newEvents",
            "New Events",
            "Notify me about new events in my area",
            "new-releases",
            !settings.pushNotifications,
          )}

          {renderToggleOption(
            "nearbyEvents",
            "Nearby Events",
            "Alert me about events happening nearby",
            "location-on",
            !settings.pushNotifications,
          )}
        </View>

        {/* Community Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community</Text>

          {renderToggleOption(
            "communityMessages",
            "Community Messages",
            "Notifications for messages and mentions",
            "forum",
            !settings.pushNotifications,
          )}

          {renderToggleOption(
            "businessUpdates",
            "Business Updates",
            "Updates from businesses you follow",
            "business",
            !settings.pushNotifications,
          )}

          {renderToggleOption(
            "buddySystemNotifications",
            "Buddy System",
            "Notifications from your safety buddy",
            "people",
            !settings.pushNotifications,
          )}
        </View>

        {/* Safety & Health */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Health</Text>

          {renderToggleOption("safetyAlerts", "Safety Alerts", "Important safety notifications and alerts", "security")}

          {renderToggleOption(
            "mentalHealthReminders",
            "Mental Health Reminders",
            "Reminders for mood tracking and wellness",
            "favorite",
            !settings.pushNotifications,
          )}
        </View>

        {/* Marketing & Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Updates</Text>

          {renderToggleOption(
            "weeklyDigest",
            "Weekly Digest",
            "Weekly summary of community activity",
            "mail",
            !settings.emailNotifications,
          )}

          {renderToggleOption(
            "marketingEmails",
            "Marketing Emails",
            "Promotional content and feature updates",
            "campaign",
            !settings.emailNotifications,
          )}
        </View>

        {/* Sound & Vibration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Vibration</Text>

          {renderToggleOption(
            "soundEnabled",
            "Sound",
            "Play sound for notifications",
            "volume-up",
            !settings.pushNotifications,
          )}

          {renderToggleOption(
            "vibrationEnabled",
            "Vibration",
            "Vibrate for notifications",
            "vibration",
            !settings.pushNotifications,
          )}
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>

          <TouchableOpacity
            style={[styles.option, !settings.pushNotifications && styles.disabledOption]}
            onPress={toggleQuietHours}
            disabled={!settings.pushNotifications}
          >
            <View style={styles.optionIcon}>
              <MaterialIcons name="do-not-disturb" size={24} color={!settings.pushNotifications ? "#ccc" : "black"} />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, !settings.pushNotifications && styles.disabledText]}>
                Enable Quiet Hours
              </Text>
              <Text style={[styles.optionDescription, !settings.pushNotifications && styles.disabledText]}>
                Silence non-urgent notifications during specified hours
              </Text>
              {settings.quietHours.enabled && (
                <Text style={styles.quietHoursTime}>
                  {settings.quietHours.startTime} - {settings.quietHours.endTime}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.toggle,
                settings.quietHours.enabled && styles.toggleActive,
                !settings.pushNotifications && styles.disabledToggle,
              ]}
            >
              <View style={[styles.toggleThumb, settings.quietHours.enabled && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Test Notification */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.testButton}>
            <MaterialIcons name="notifications" size={20} color="black" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
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
  disabledOption: {
    opacity: 0.5,
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
  disabledText: {
    color: "#ccc",
  },
  quietHoursTime: {
    fontSize: 12,
    color: "black",
    fontWeight: "600",
    marginTop: 4,
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
  disabledToggle: {
    backgroundColor: "#f0f0f0",
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
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f8f8",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "black",
  },
  testButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "black",
    fontWeight: "600",
  },
})
