"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import type { ProfileScreenProps } from "../../types/navigation"
import React from "react"
import { businessService } from "../../services/businessService"
import { reviewService } from "../../services/reviewService"
import { buddySystemService } from "../../services/buddySystemService"
import { useTheme } from "../../Contexts/ThemeContext"

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut, refreshUser } = useAuth()
  const { theme, toggleTheme, setSystemTheme, setThemePreference } = useTheme()
  const [stats, setStats] = useState({
    savedPlaces: 0,
    eventsAttended: 0,
    reviewsWritten: 0,
    buddyConnections: 0,
  })

  // Refresh user when returning to this screen
  // @ts-ignore navigation has addListener
  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshUser()
      loadStats()
    })
    return unsubscribe
  }, [navigation])

  useEffect(() => {
    loadStats()
  }, [user?.id])

  const loadStats = async () => {
    if (!user?.id) return
    try {
      const [saved, userReviews, matches] = await Promise.all([
        businessService.getSavedBusinesses(user.id),
        reviewService.getUserReviews(user.id),
        buddySystemService.getBuddyMatches(user.id),
      ])
      setStats({
        savedPlaces: saved.success ? (saved.businesses?.length || 0) : 0,
        eventsAttended: 0, // TODO: connect to events attendance when available
        reviewsWritten: userReviews.length,
        buddyConnections: matches.length,
      })
    } catch (e) {
      // keep defaults
    }
  }

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
      title: "Live Events",
      description: "Join ongoing live streams",
      icon: "videocam",
      onPress: () => navigation.navigate("Events", { screen: "EventsMain" }),
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
      title: "Theme",
      description: theme.isDark ? "Dark mode enabled" : "Light mode enabled",
      icon: theme.isDark ? "brightness-3" : "brightness-7",
      onPress: () => {}, // No action for the row itself
      hasToggle: true,
      toggleValue: theme.isDark,
      onToggle: toggleTheme,
    },
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
    {
      title: "Review Suggestions",
      description: "Approve or reject community recommendations",
      icon: "approval",
      onPress: () => navigation.navigate("SuggestionReview" as any),
    },
  ]

  const renderOption = (option: any) => (
    <TouchableOpacity
      key={option.title}
      style={[styles.option, { borderBottomColor: theme.colors.divider }]}
      onPress={option.onPress}
      disabled={option.hasToggle}
    >
      <View style={styles.optionIcon}>
        <MaterialIcons name={option.icon as any} size={24} color={theme.colors.text} />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionTitle, { color: theme.colors.text }]}>{option.title}</Text>
        <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>{option.description}</Text>
      </View>
      {option.hasToggle ? (
        <TouchableOpacity
          style={[styles.toggle, option.toggleValue && [styles.toggleActive, { backgroundColor: theme.colors.primary }]]}
          onPress={option.onToggle}
          activeOpacity={0.8}
        >
          <View style={[styles.toggleThumb, option.toggleValue && styles.toggleThumbActive]} />
        </TouchableOpacity>
      ) : (
        <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.isDark ? "black" : theme.colors.surface }]}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40 }} />
            ) : (
              <MaterialIcons name="person" size={40} color="#ccc" />
            )}
          </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={16} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>{user?.name || "User"}</Text>
            <Text style={[styles.userEmail, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>{user?.email || "user@example.com"}</Text>
            <View style={styles.verificationBadge}>
              <MaterialIcons name="verified-user" size={16} color={theme.isDark ? theme.colors.text : theme.colors.textSecondary} />
              <Text style={[styles.verificationText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Verified Member</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
           <View style={styles.statItem}>
             <Text style={[styles.statNumber, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>{stats.savedPlaces}</Text>
             <Text style={[styles.statLabel, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Saved</Text>
           </View>
           <View style={styles.statItem}>
             <Text style={[styles.statNumber, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>{stats.eventsAttended}</Text>
             <Text style={[styles.statLabel, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Events</Text>
           </View>
           <View style={styles.statItem}>
             <Text style={[styles.statNumber, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>{stats.reviewsWritten}</Text>
             <Text style={[styles.statLabel, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Reviews</Text>
           </View>
           <View style={styles.statItem}>
             <Text style={[styles.statNumber, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>{stats.buddyConnections}</Text>
             <Text style={[styles.statLabel, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }]}>Buddies</Text>
           </View>
         </View>
     </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Options */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile</Text>
          {profileOptions.map(renderOption)}
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Settings</Text>
          {settingsOptions.map(renderOption)}
        </View>

        {/* Account Actions */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color={theme.colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName, { color: theme.colors.text }]}>Mirae SafePlaces</Text>
          <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
          <Text style={[styles.appDescription, { color: theme.colors.textSecondary }]}>Building safer, more inclusive communities for LGBTQ+ individuals</Text>
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
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomColor:"black",
    borderBottomWidth: 0.5,
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
    backgroundColor: "black",
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
    backgroundColor: "black",
    borderWidth: 1,
    borderColor: "#ffebee",
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "white",
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
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ddd",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "#FF6B6B",
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
})
