"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Image, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { messagingService } from "../../services/messagingService"
import type { UserProfile } from "../../types"

export default function BlockedUsersScreen({ navigation }: any) {
  const { user } = useAuth()
  const [blocked, setBlocked] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBlocked()
  }, [user?.id])

  const loadBlocked = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const users = await messagingService.getBlockedUsers(user.id)
      setBlocked(users)
    } catch (e) {
      console.error("Failed to load blocked users", e)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (targetId: string) => {
    if (!user?.id) return
    const ok = await messagingService.unblockUser(user.id, targetId)
    if (ok) {
      setBlocked((prev) => prev.filter((u) => u.id !== targetId))
      Alert.alert("Unblocked", "User has been unblocked")
    } else {
      Alert.alert("Error", "Failed to unblock user")
    }
  }

  const renderItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.item}>
      <Image source={{ uri: item.avatar_url || "/placeholder.svg?height=48&width=48&text=U" }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.handle}>@{(item as any)?.username || item.email?.split("@")[0]}</Text>
      </View>
      <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item.id)}>
        <MaterialIcons name="lock-open" size={18} color="white" />
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["black", "black"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      {blocked.length === 0 && !loading ? (
        <View style={styles.empty}>
          <MaterialIcons name="block" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyDesc}>Users you block will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={loadBlocked}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { paddingTop: 40, paddingBottom: 16, paddingHorizontal: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { padding: 8 },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  name: { fontSize: 16, fontWeight: "600", color: "#333" },
  handle: { fontSize: 12, color: "#666" },
  unblockBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  unblockText: { color: "white", marginLeft: 6, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginTop: 12 },
  emptyDesc: { fontSize: 14, color: "#666", marginTop: 4 },
})