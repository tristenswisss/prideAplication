"use client"

import { useState, useEffect, useMemo } from "react"
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from "react-native"
import { safeSpacesService, type CrisisContact } from "../../services/safeSpacesService"
import type { SafeSpace } from "../../types"

interface HelpSupportScreenProps {
  navigation: any
}

export default function HelpSupportScreen({ navigation }: HelpSupportScreenProps) {
  const [safeSpaces, setSafeSpaces] = useState<SafeSpace[]>([])
  const [crisisContacts, setCrisisContacts] = useState<CrisisContact[]>([])
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [spacesData, contactsData, emailData] = await Promise.all([
        (await safeSpacesService.getAllSafeSpaces()).data || [],
        (await safeSpacesService.getCrisisContacts()).data || [],
        "prog.shout@gmail.com",
      ])

      setSafeSpaces(spacesData as SafeSpace[])
      setCrisisContacts(contactsData as CrisisContact[])
      setAdminEmail(emailData as string)
    } catch (error) {
      console.error("Error loading help data:", error)
      Alert.alert("Error", "Failed to load help information")
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneCall = (phoneNumber: string) => {
    Alert.alert("Call Confirmation", `Do you want to call ${phoneNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: () => {
          Linking.openURL(`tel:${phoneNumber}`).catch(() => {
            Alert.alert("Error", "Unable to make phone call")
          })
        },
      },
    ])
  }

  const handleEmailContact = (email: string) => {
    Alert.alert("Email Contact", `Do you want to send an email to ${email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Email",
        onPress: () => {
          Linking.openURL(`mailto:${email}`).catch(() => {
            Alert.alert("Error", "Unable to open email client")
          })
        },
      },
    ])
  }

  const getCategoryIcon = (category: SafeSpace["category"]): string => {
    switch (category) {
      case "organization":
        return "🏢"
      case "healthcare":
        return "🏥"
      case "restaurant":
        return "🍽️"
      case "drop_in_center":
        return "🏠"
      case "community_center":
        return "🏘️"
      default:
        return "📍"
    }
  }

  const getCategoryTitle = (category: SafeSpace["category"]): string => {
    switch (category) {
      case "organization":
        return "Organizations"
      case "healthcare":
        return "Healthcare"
      case "restaurant":
        return "Restaurants & Cafes"
      case "drop_in_center":
        return "Drop-in Centers"
      case "community_center":
        return "Community Centers"
      default:
        return "Other"
    }
  }

  const groupedSafeSpaces = useMemo(() => {
    return safeSpaces.reduce(
      (groups, space: SafeSpace) => {
        const category = space.category
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(space)
        return groups
      },
      {} as Record<SafeSpace["category"], SafeSpace[]>,
    )
  }, [safeSpaces])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading help information...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>Resources and assistance for the LGBTQ+ community</Text>
      </View>

      {/* Crisis Helplines */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Crisis Helplines</Text>
        <Text style={styles.sectionDescription}>Immediate legal assistance and support</Text>
        {crisisContacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactLocation}>{contact.country}</Text>
            </View>
            <Text style={styles.contactDescription}>{contact.description}</Text>
            <TouchableOpacity style={styles.phoneButton} onPress={() => handlePhoneCall(contact.phone)}>
              <Text style={styles.phoneButtonText}>📞 {contact.phone}</Text>
            </TouchableOpacity>
            <Text style={styles.availabilityText}>Available: {contact.available_hours}</Text>
            {/* available_24_7 not in CrisisContact; show if text contains 24/7 */}
            {(/24\/?7/i.test(contact.available_hours)) && <Text style={styles.available24Text}>Available 24/7</Text>}
          </View>
        ))}
      </View>

      {/* Safe Spaces */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏳️‍🌈 Safe Spaces</Text>
        <Text style={styles.sectionDescription}>LGBTQ+ friendly locations and organizations in Zimbabwe</Text>

        {Object.entries(groupedSafeSpaces).map(([category, spaces]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {getCategoryIcon(category as SafeSpace["category"])} {getCategoryTitle(category as SafeSpace["category"])}
            </Text>
            {spaces.map((space) => (
              <View key={space.id} style={styles.spaceCard}>
                <View style={styles.spaceHeader}>
                  <Text style={styles.spaceName}>{space.name}</Text>
                  {space.verified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
                </View>
                <Text style={styles.spaceDescription}>{space.description}</Text>
                <Text style={styles.spaceAddress}>📍 {space.address}</Text>

                {space.services.length > 0 && (
                  <View style={styles.servicesContainer}>
                    <Text style={styles.servicesTitle}>Services:</Text>
                    <View style={styles.servicesTags}>
                      {space.services.map((service, index) => (
                        <Text key={index} style={styles.serviceTag}>
                          {service}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.spaceFeatures}>
                  {space.lgbtq_friendly && <Text style={styles.featureTag}>🏳️‍🌈 LGBTQ+ Friendly</Text>}
                  {space.trans_friendly && <Text style={styles.featureTag}>🏳️‍⚧️ Trans Friendly</Text>}
                </View>

                {space.phone && (
                  <TouchableOpacity style={styles.contactButton} onPress={() => handlePhoneCall(space.phone!)}>
                    <Text style={styles.contactButtonText}>📞 Call</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Admin Contact */}
      {adminEmail && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 App Support</Text>
          <Text style={styles.sectionDescription}>
            Contact the app administrators for technical support or feedback
          </Text>
          <TouchableOpacity style={styles.adminContactCard} onPress={() => handleEmailContact(adminEmail)}>
            <Text style={styles.adminContactTitle}>Pride Application Admin</Text>
            <Text style={styles.adminContactEmail}>{adminEmail}</Text>
            <Text style={styles.adminContactAction}>Tap to send email</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Additional Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Additional Resources</Text>
        <View style={styles.resourceCard}>
          <Text style={styles.resourceTitle}>Mental Health Support</Text>
          <Text style={styles.resourceDescription}>
            If you're experiencing mental health challenges, please reach out to local mental health professionals or
            use our in-app mental health resources.
          </Text>
        </View>

        <View style={styles.resourceCard}>
          <Text style={styles.resourceTitle}>Safety Tips</Text>
          <Text style={styles.resourceDescription}>
            Always prioritize your safety when meeting new people or attending events. Trust your instincts and inform
            trusted friends about your plans.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginTop: 20,
    backgroundColor: "#fff",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  contactCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  contactHeader: {
    marginBottom: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  contactLocation: {
    fontSize: 14,
    color: "#666",
  },
  contactDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  phoneButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 5,
  },
  phoneButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  availabilityText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  available24Text: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "bold",
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  spaceCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  spaceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  spaceName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  verifiedBadge: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "bold",
  },
  spaceDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  spaceAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  servicesContainer: {
    marginBottom: 10,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  servicesTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  serviceTag: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: "#495057",
    marginRight: 5,
    marginBottom: 5,
  },
  spaceFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  featureTag: {
    backgroundColor: "#d4edda",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: "#155724",
    marginRight: 5,
    marginBottom: 5,
  },
  contactButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 5,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  adminContactCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#6f42c1",
  },
  adminContactTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  adminContactEmail: {
    fontSize: 14,
    color: "#6f42c1",
    marginBottom: 5,
  },
  adminContactAction: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  resourceCard: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  resourceDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
})
