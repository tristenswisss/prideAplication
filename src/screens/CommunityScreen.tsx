"use client"

import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import type { CommunityScreenProps } from "../../types/navigation"

export default function CommunityScreen({ navigation }: CommunityScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient colors={["black", "black"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Community</Text>
              <Text style={styles.headerSubtitle}>Connect with your Pride family</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open messages"
              style={styles.iconButton}
              onPress={() => navigation.navigate("Messages")}
            >
              <MaterialIcons name="message" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate("Messages")}>
              <MaterialIcons name="chat" size={22} color="black" />
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => (navigation.getParent() as any)?.navigate("Events")}
            >
              <MaterialIcons name="event" size={22} color="black" />
              <Text style={styles.quickActionText}>Live events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => (navigation.getParent() as any)?.navigate("Home")}
            >
              <MaterialIcons name="groups" size={22} color="black" />
              <Text style={styles.quickActionText}>Safe spaces</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Community feed coming soon</Text>
            <Text style={styles.placeholderText}>
              Join conversations, discover local groups, and connect with community members.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#ddd",
    marginTop: 4,
    fontSize: 14,
  },
  iconButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 8,
    borderRadius: 20,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  quickActionText: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
  },
  placeholderCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333",
  },
  placeholderText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
})

