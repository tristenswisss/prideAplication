import React from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../Contexts/ThemeContext"

interface TermsAndConditionsModalProps {
  visible: boolean
  onClose: () => void
  onAccept: () => void;
}

export default function TermsAndConditionsModal({ visible, onClose }: TermsAndConditionsModalProps) {
  const { theme } = useTheme()
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Terms and Conditions</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Introduction</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            Welcome to Mirae Safe Spaces ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your use of the Mirae Safe Spaces mobile application and related services (collectively, the "Service").
          </Text>
          <Text style={[styles.importantText, { color: theme.colors.error }]}>
            IMPORTANT: Mirae Safe Spaces is a community platform designed to provide safe spaces, support, and connection for LGBTQ+ individuals. This is NOT a dating application or romantic matchmaking service. Our platform focuses on community building, mutual support, and creating inclusive environments.
          </Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Platform Purpose and Community Guidelines</Text>
          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>2.1 Platform Purpose</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>Mirae Safe Spaces is designed to:</Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Provide safe, supportive spaces for LGBTQ+ individuals</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Foster community connections and friendships</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Share resources and support</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Create inclusive environments for discussion and mutual aid</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• NOT for romantic dating, hookups, or sexual content</Text>
          </View>

          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>2.2 Community Standards</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>Users must:</Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Treat all community members with respect and dignity</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Maintain appropriate, non-sexual interactions</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Support the creation of safe spaces for all users</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Respect diverse identities within the LGBTQ+ spectrum</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Report inappropriate behavior or content</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. User Accounts and Eligibility</Text>
          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>3.1 Age Requirement</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            You must be at least 13 years old to use this Service. Users under 18 require parental consent.
          </Text>

          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>3.2 Account Registration</Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• You must provide accurate, current information</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• You are responsible for maintaining account security</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• One account per person</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• You may not share your account credentials</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Prohibited Content and Conduct</Text>
          <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>4.1 Strictly Prohibited</Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletTextBold, { color: theme.colors.error }]}>• Dating, romantic, or sexual solicitation</Text>
            <Text style={[styles.bulletTextBold, { color: theme.colors.error }]}>• Sexually explicit content or imagery</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Harassment, bullying, or hate speech</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Discrimination based on identity, orientation, or expression</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Sharing personal information of others without consent</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Spam, commercial solicitation, or advertising</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Illegal activities or content</Text>
            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>• Impersonation or false identity claims</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Privacy and Data Protection</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            We collect only necessary information to provide our Service. We do not share personal data with third parties for dating purposes. Users control their privacy settings and information sharing.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Mental Health Resources</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            While we provide community support, we are not a substitute for professional mental health services. Users experiencing crisis should contact appropriate emergency services.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Limitation of Liability</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW: We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount paid for the Service (if any). We are not responsible for user-generated content or user interactions.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>8. Changes to Terms</Text>
          <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
            We may update these Terms periodically. Material changes will be communicated to users. Continued use constitutes acceptance of updated Terms.
          </Text>

          <Text style={[styles.reminderBox, { backgroundColor: theme.isDark ? 'rgba(255,255,0,0.1)' : '#fff3cd', borderColor: theme.colors.warning, color: theme.colors.text }]}>
            REMINDER: Mirae Safe Spaces is a community support platform for LGBTQ+ individuals. This is NOT a dating service. Users seeking romantic connections should use appropriate dating platforms.
          </Text>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  importantText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 12,
    fontStyle: "italic",
  },
  bulletPoint: {
    marginBottom: 12,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  bulletTextBold: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 4,
  },
  reminderBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  bottomSpacing: {
    height: 30,
  },
})