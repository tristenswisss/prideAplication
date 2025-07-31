"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import type { HelpSupportScreenProps } from "../../types/navigation"

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

export default function HelpSupportScreen({ navigation }: HelpSupportScreenProps) {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    email: "",
  })
  const [showContactForm, setShowContactForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const faqs: FAQ[] = [
    {
      id: "1",
      question: "How do I find LGBTQ+ friendly businesses?",
      answer:
        "Use our search feature or browse the map view. Look for businesses with the rainbow flag icon or 'LGBTQ+ Friendly' badge. You can also filter by category and read reviews from other community members.",
      category: "General",
    },
    {
      id: "2",
      question: "How do I report inappropriate content or behavior?",
      answer:
        "You can report content by tapping the three dots menu on any post or profile and selecting 'Report'. For urgent safety concerns, use the Safety Center in your profile or contact emergency services directly.",
      category: "Safety",
    },
    {
      id: "3",
      question: "What is the Buddy System?",
      answer:
        "The Buddy System connects you with trusted community members for safety check-ins when visiting new places or attending events. Your buddy can track your location and receive alerts if you don't check in as planned.",
      category: "Safety",
    },
    {
      id: "4",
      question: "How do I create an event?",
      answer:
        "Go to the Events tab and tap the '+' button. Fill in the event details, set the date and location, and publish. Your event will be visible to the community and people can RSVP.",
      category: "Events",
    },
    {
      id: "5",
      question: "Can I use the app offline?",
      answer:
        "Yes! The app works offline with cached data. You can view previously loaded businesses and events, but some features like messaging and live updates require an internet connection.",
      category: "Technical",
    },
    {
      id: "6",
      question: "How do I change my privacy settings?",
      answer:
        "Go to Profile > Privacy & Safety to control who can see your profile, send you messages, and access your location. You can also manage data collection preferences there.",
      category: "Privacy",
    },
  ]

  const supportOptions = [
    {
      title: "Email Support",
      description: "Get help via email within 24 hours",
      icon: "email",
      action: () => Linking.openURL("mailto:support@pridesafeplaces.com"),
    },
    {
      title: "Community Forum",
      description: "Ask questions and get help from the community",
      icon: "forum",
      action: () => Alert.alert("Coming Soon", "Community forum will be available soon!"),
    },
    {
      title: "Live Chat",
      description: "Chat with our support team (Mon-Fri 9AM-5PM)",
      icon: "chat",
      action: () => Alert.alert("Live Chat", "Live chat is currently unavailable. Please use email support."),
    },
    {
      title: "Phone Support",
      description: "Call us for urgent issues",
      icon: "phone",
      action: () => Linking.openURL("tel:+1-555-PRIDE-HELP"),
    },
  ]

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId)
  }

  const submitContactForm = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim() || !contactForm.email.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      Alert.alert("Success", "Your message has been sent! We'll get back to you within 24 hours.")
      setContactForm({ subject: "", message: "", email: "" })
      setShowContactForm(false)
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const renderFAQ = (faq: FAQ) => (
    <TouchableOpacity key={faq.id} style={styles.faqItem} onPress={() => toggleFAQ(faq.id)}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{faq.question}</Text>
        <MaterialIcons name={expandedFAQ === faq.id ? "expand-less" : "expand-more"} size={24} color="#666" />
      </View>
      {expandedFAQ === faq.id && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
    </TouchableOpacity>
  )

  const renderSupportOption = (option: (typeof supportOptions)[0]) => (
    <TouchableOpacity key={option.title} style={styles.supportOption} onPress={option.action}>
      <View style={styles.supportIcon}>
        <MaterialIcons name={option.icon as any} size={24} color="#FF6B6B" />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{option.title}</Text>
        <Text style={styles.supportDescription}>{option.description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#FF6B6B", "#4ECDC4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Help</Text>
          {supportOptions.map(renderSupportOption)}
        </View>

        {/* Contact Form Toggle */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.contactFormToggle} onPress={() => setShowContactForm(!showContactForm)}>
            <MaterialIcons name="contact-support" size={24} color="#FF6B6B" />
            <Text style={styles.contactFormToggleText}>Send us a message</Text>
            <MaterialIcons name={showContactForm ? "expand-less" : "expand-more"} size={24} color="#666" />
          </TouchableOpacity>

          {showContactForm && (
            <View style={styles.contactForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={contactForm.email}
                  onChangeText={(text) => setContactForm((prev) => ({ ...prev, email: text }))}
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  value={contactForm.subject}
                  onChangeText={(text) => setContactForm((prev) => ({ ...prev, subject: text }))}
                  placeholder="Brief description of your issue"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={contactForm.message}
                  onChangeText={(text) => setContactForm((prev) => ({ ...prev, message: text }))}
                  placeholder="Please describe your issue in detail..."
                  multiline
                  numberOfLines={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={submitContactForm}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>{loading ? "Sending..." : "Send Message"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map(renderFAQ)}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>January 2024</Text>
          </View>

          <TouchableOpacity
            style={styles.infoItem}
            onPress={() => Linking.openURL("https://pridesafeplaces.com/terms")}
          >
            <Text style={styles.infoLabel}>Terms of Service</Text>
            <MaterialIcons name="open-in-new" size={16} color="#FF6B6B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoItem}
            onPress={() => Linking.openURL("https://pridesafeplaces.com/privacy")}
          >
            <Text style={styles.infoLabel}>Privacy Policy</Text>
            <MaterialIcons name="open-in-new" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Emergency Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Resources</Text>

          <TouchableOpacity style={styles.emergencyOption} onPress={() => Linking.openURL("tel:988")}>
            <MaterialIcons name="phone" size={24} color="#F44336" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Crisis Hotline</Text>
              <Text style={styles.emergencyDescription}>988 - 24/7 Mental Health Crisis Support</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyOption} onPress={() => Linking.openURL("tel:911")}>
            <MaterialIcons name="local-hospital" size={24} color="#F44336" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Emergency Services</Text>
              <Text style={styles.emergencyDescription}>911 - Police, Fire, Medical Emergency</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyOption}
            onPress={() => Linking.openURL("https://www.thetrevorproject.org/")}
          >
            <MaterialIcons name="favorite" size={24} color="#F44336" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Trevor Project</Text>
              <Text style={styles.emergencyDescription}>LGBTQ+ Crisis Support & Suicide Prevention</Text>
            </View>
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
  },
  headerRight: {
    width: 40,
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
  supportOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  supportIcon: {
    width: 40,
    alignItems: "center",
  },
  supportContent: {
    flex: 1,
    marginLeft: 15,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  supportDescription: {
    fontSize: 14,
    color: "#666",
  },
  contactFormToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contactFormToggleText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  contactForm: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  faqItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    color: "#333",
  },
  infoValue: {
    fontSize: 16,
    color: "#666",
  },
  emergencyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 15,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  emergencyDescription: {
    fontSize: 14,
    color: "#666",
  },
})
