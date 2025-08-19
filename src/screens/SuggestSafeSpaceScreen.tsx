"use client"
import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { safeSpacesService } from "../../services/safeSpacesService"
import AppModal from "../../components/AppModal"

export default function SuggestSafeSpaceScreen({ navigation }: any) {
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("organization")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal] = useState<{ visible: boolean; title?: string; message?: string; onClose?: () => void }>({
    visible: false,
  })

  const submit = async () => {
    if (!user?.id) {
      setModal({ visible: true, title: "Sign in required", message: "Please sign in to recommend a location." })
      return
    }
    if (!name.trim() || !category || !address.trim()) {
      setModal({ visible: true, title: "Missing info", message: "Name, category and address are required." })
      return
    }
    setSubmitting(true)
    try {
      const result = await safeSpacesService.suggestSafeSpace({
        suggested_by: user.id,
        name,
        description,
        category,
        address,
        city,
        country,
        phone,
        email,
        website,
        services: [],
        lgbtq_friendly: true,
        trans_friendly: true,
        wheelchair_accessible: false,
      } as any)
      if (result.success) {
        setModal({
          visible: true,
          title: "Submitted",
          message: "Thank you! We'll review your suggestion.",
          onClose: () => navigation.goBack(),
        })
      } else {
        setModal({ visible: true, title: "Error", message: result.error || "Failed to submit suggestion" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <LinearGradient colors={["#FF6B6B", "#FF8E53"]} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Recommend a Safe Location</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Location name" />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {[
            { id: "organization", name: "Organization" },
            { id: "healthcare", name: "Healthcare" },
            { id: "restaurant", name: "Restaurant" },
            { id: "drop_in_center", name: "Drop-in" },
            { id: "community_center", name: "Community" },
            { id: "other", name: "Other" },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, category === cat.id && styles.chipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[styles.chipText, category === cat.id && styles.chipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: "top" }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Why is this a safe place?"
          multiline
        />

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Street, area" />

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Country</Text>
            <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Country" />
          </View>
        </View>

        <Text style={styles.label}>Contact (optional)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" />
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" />
        <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="Website" />

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit Recommendation"}</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppModal
        visible={modal.visible}
        onClose={() => {
          const next = modal.onClose
          setModal({ visible: false })
          if (next) next()
        }}
        title={modal.title}
        variant="center"
        rightAction={{
          label: "OK",
          onPress: () => {
            const next = modal.onClose
            setModal({ visible: false })
            if (next) next()
          },
        }}
      >
        <Text style={{ fontSize: 16, color: "#333" }}>{modal.message}</Text>
      </AppModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: "#666", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#eee",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#FF6B6B",
  },
  chipText: { color: "#333", fontWeight: "600" },
  chipTextActive: { color: "white" },
  submitBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 12,
  },
  submitText: { color: "white", fontWeight: "bold" },
})