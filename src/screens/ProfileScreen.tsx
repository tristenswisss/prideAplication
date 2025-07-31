"use client"

import { useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import type { ProfileScreenProps } from "../../types/navigation"

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut } = useAuth()
  const [stats, setStats] = useState({
    savedPlaces: 12,
    eventsAttended: 8,
    reviewsWritten: 15,
    buddyConnections: 3,
  })

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ])
  }

  const profileOptions = [
    {
      title: "Edit Profile",
      description: "Update your personal information",
      icon: "edit",
      onPress: () => navigation.navigate("EditProfile"),
    },
    {
      title: "Saved Places",
      description: `${stats.savedPlaces} saved places`,
      icon: "bookmark",
      onPress: () => navigation.navigate("SavedPlaces"),
    },
    {
      title: "My Events",
      description: `${stats.eventsAttended} events attended`,
      icon: "event",
      onPress: () => navigation.navigate("MyEvents"),
    },
    {
      title: "Safety Center",
      description: "Emergency contacts and safety features",
      icon: "shield",
      onPress: () => navigation.navigate("Safety"),
    },
    {
      title: "Buddy System",
      description: `${stats.buddyConnections} buddy connections`,
      icon: "people",
      onPress: () => navigation.navigate("BuddySystem"),
    },
    {
      title: "Mental Health",
      description: "Wellness tracking and resources",
      icon: "favorite",
      onPress: () => navigation.navigate("MentalHealth"),
    },
  ]

  const settingsOptions = [
    {
      title: "Notifications",
      description: "Manage your notification preferences",
      icon: "notifications",
      onPress: () => navigation.navigate("NotificationSettings"),
    },
    {
      title: "Privacy & Safety",
      description: "Control your privacy and safety settings",
      icon: "privacy-tip",
      onPress: () => navigation.navigate("PrivacySafety"),
    },
    {
      title: "Help & Support",
      description: "Get help and contact support",
      icon: "help",
      onPress: () => navigation.navigate("HelpSupport"),
    },
  ]

  const renderOption = (option: (typeof profileOptions)[0]) => (
    <TouchableOpacity key={option.title} style={styles.option} onPress={option.onPress}>
      <View style={styles.optionIcon}>
        <MaterialIcons name={option.icon as any} size={24} color="#FF6B6B" />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={40} color="#ccc" />
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
            <View style={styles.verificationBadge}>
              <MaterialIcons name="verified-user" size={16} color="white" />
              <Text style={styles.verificationText}>Verified Member</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.savedPlaces}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.eventsAttended}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.reviewsWritten}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.buddyConnections}</Text>
            <Text style={styles.statLabel}>Buddies</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          {profileOptions.map(renderOption)}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {settingsOptions.map(renderOption)}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color="#F44336" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Pride SafePlaces</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>Building safer, more inclusive communities for LGBTQ+ individuals</Text>
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  verificationText: {
    marginLeft: 4,
    fontSize: 12,
    color: "white",
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 15,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "white",
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    marginBottom: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#ffebee",
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  appDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
})
