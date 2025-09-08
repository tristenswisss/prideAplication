"use client"
import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { safeSpacesService } from "../../services/safeSpacesService"
import AppModal from "../../components/AppModal"
import { useTheme } from "../../Contexts/ThemeContext"

export default function SuggestSafeSpaceScreen({ navigation }: any) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("restaurant")
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryVariant]} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
          <Text style={{ color: theme.colors.surface, fontSize: 18, fontWeight: "bold" }}>Recommend a Safe Location</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Name</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.inputText
          }]}
          value={name}
          onChangeText={setName}
          placeholder="Location name"
          placeholderTextColor={theme.colors.placeholder}
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {[
            { id: "finance", name: "Finance" },
            { id: "service", name: "Service" },
            { id: "hotel", name: "Hotel" },
            { id: "restaurant", name: "Restaurant" },
            { id: "shopping", name: "Shopping" },
            { id: "education", name: "Education" },
            { id: "entertainment", name: "Entertainment" },
            { id: "transport", name: "Transport" },
            { id: "healthcare", name: "Healthcare" },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, {
                backgroundColor: theme.isDark ? theme.colors.card : theme.colors.surface,
                borderColor: theme.colors.border
              }, category === cat.id && [styles.chipActive, { backgroundColor: theme.colors.primary }]]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[styles.chipText, { color: theme.isDark ? theme.colors.text : theme.colors.textSecondary }, category === cat.id && [styles.chipTextActive, { color: theme.colors.surface }]]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.input, {
            height: 90,
            textAlignVertical: "top",
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.inputText
          }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Why is this a safe place?"
          placeholderTextColor={theme.colors.placeholder}
          multiline
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Address</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.inputText
          }]}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, area"
          placeholderTextColor={theme.colors.placeholder}
        />

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>City</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.inputBorder,
                color: theme.colors.inputText
              }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Country</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.inputBorder,
                color: theme.colors.inputText
              }]}
              value={country}
              onChangeText={setCountry}
              placeholder="Country"
              placeholderTextColor={theme.colors.placeholder}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Contact (optional)</Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.inputText
          }]}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone"
          placeholderTextColor={theme.colors.placeholder}
        />
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.inputText
          }]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={theme.colors.placeholder}
        />
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            color: theme.colors.inputText
          }]}
          value={website}
          onChangeText={setWebsite}
          placeholder="Website"
          placeholderTextColor={theme.colors.placeholder}
        />

        <TouchableOpacity
          style={[styles.submitBtn, {
            backgroundColor: theme.colors.success,
            shadowColor: theme.colors.shadow,
            elevation: theme.isDark ? 4 : 2,
            shadowOpacity: theme.isDark ? 0.2 : 0.1
          }, submitting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={[styles.submitText, { color: theme.colors.surface }]}>{submitting ? "Submitting..." : "Submit Recommendation"}</Text>
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
        <Text style={{ fontSize: 16, color: theme.colors.text }}>{modal.message}</Text>
      </AppModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  chipActive: {
    // backgroundColor will be set inline
  },
  chipText: { fontWeight: "600" },
  chipTextActive: {
    // color will be set inline
  },
  submitBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 12,
  },
  submitText: { fontWeight: "bold" },
})