import React, { useState } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { supabase } from "../lib/supabase"
import { useTheme } from "../Contexts/ThemeContext"

interface ForgotPasswordModalProps {
  visible: boolean
  onClose: () => void
}

export default function ForgotPasswordModal({ visible, onClose }: ForgotPasswordModalProps) {
  const { theme } = useTheme()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    if (!email.includes('@')) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'your-app://reset-password', // You can customize this URL
      })

      if (error) {
        let errorMessage = error.message
        if (errorMessage.includes('User not found')) {
          errorMessage = 'No account found with this email address.'
        } else if (errorMessage.includes('Email rate limit exceeded')) {
          errorMessage = 'Too many reset attempts. Please wait before trying again.'
        }
        Alert.alert("Error", errorMessage)
      } else {
        setSent(true)
        Alert.alert(
          "Reset Link Sent", 
          "We've sent a password reset link to your email. Please check your email and follow the instructions to reset your password.",
          [
            {
              text: "OK",
              onPress: () => {
                setEmail("")
                setSent(false)
                onClose()
              }
            }
          ]
        )
      }
    } catch (error) {
      console.error('Password reset error:', error)
      Alert.alert("Error", "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setSent(false)
    setLoading(false)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Reset Password</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="lock-reset" size={60} color={theme.colors.accent} />
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>Forgot your password?</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              No worries! Enter your email address below and we'll send you a link to reset your password.
            </Text>

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
              <MaterialIcons name="email" size={20} color={theme.colors.placeholder} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.inputText }]}
                placeholder="Enter your email address"
                placeholderTextColor={theme.colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading && !sent}
                autoFocus={true}
              />
            </View>

            <TouchableOpacity
              style={[styles.resetButton, (loading || !email.trim()) && styles.disabledButton]}
              onPress={handlePasswordReset}
              disabled={loading || !email.trim() || sent}
            >
              <LinearGradient colors={["#000000", "#DAA520"]} style={styles.resetButtonGradient}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.loadingText}>Sending Reset Link...</Text>
                  </View>
                ) : sent ? (
                  <Text style={styles.resetButtonText}>Reset Link Sent ✓</Text>
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {sent && (
              <View style={[styles.successContainer, { backgroundColor: theme.isDark ? 'rgba(76, 175, 80, 0.1)' : '#f1f8e9' }]}>
                <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                <Text style={[styles.successText, { color: theme.colors.success }]}>
                  Check your email for the reset link!
                </Text>
              </View>
            )}

            <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
              Remember your password?{" "}
              <TouchableOpacity onPress={handleClose} disabled={loading}>
                <Text style={[styles.helpLink, { color: theme.colors.accent }]}>Back to Sign In</Text>
              </TouchableOpacity>
            </Text>

            <Text style={[styles.supportText, { color: theme.colors.textTertiary }]}>
              Still having trouble? Contact our support team for assistance.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    marginBottom: 30,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    width: "100%",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
  },
  resetButton: {
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: "100%",
  },
  disabledButton: {
    opacity: 0.5,
  },
  resetButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 10,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 30,
    width: "100%",
  },
  successText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
    flex: 1,
  },
  helpText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  helpLink: {
    textAlign: "center",
    position: "relative",
    top: 4,
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  supportText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
    position: "absolute",
    bottom: 30,
  },
})