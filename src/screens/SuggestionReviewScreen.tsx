"use client"
import { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Alert } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { safeSpacesService } from "../../services/safeSpacesService"

interface Suggestion {
  id: string
  name: string
  description?: string
  category: string
  address: string
  city?: string
  country?: string
  created_at: string
}

export default function SuggestionReviewScreen({ navigation }: any) {
  const [pending, setPending] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await safeSpacesService.listSuggestions("pending")
      if (res.success && res.data) setPending(res.data as any)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const approve = async (id: string) => {
    const res = await safeSpacesService.approveSuggestion(id)
    if (!res.success) Alert.alert("Error", res.error || "Failed to approve")
    await load()
  }

  const reject = async (id: string) => {
    const res = await safeSpacesService.rejectSuggestion(id)
    if (!res.success) Alert.alert("Error", res.error || "Failed to reject")
    await load()
  }

  const renderItem = ({ item }: { item: Suggestion }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.meta}>{item.category.toUpperCase()} • {item.city || ""} {item.country || ""}</Text>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => reject(item.id)}>
          <MaterialIcons name="close" size={18} color="white" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => approve(item.id)}>
          <MaterialIcons name="check" size={18} color="white" />
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <LinearGradient colors={["#FF6B6B", "#FF8E53"]} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Review Suggestions</Text>
        </View>
      </LinearGradient>
      <FlatList
        data={pending}
        refreshing={loading}
        onRefresh={load}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={{ marginTop: 8, color: "#666" }}>No suggestions to review</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#eee" },
  title: { fontSize: 16, fontWeight: "bold", color: "#333" },
  meta: { fontSize: 12, color: "#999", marginTop: 2 },
  desc: { fontSize: 14, color: "#555", marginTop: 8 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  btn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  approve: { backgroundColor: "#4CAF50" },
  reject: { backgroundColor: "#F44336" },
  btnText: { color: "white", marginLeft: 6, fontWeight: "600" },
})