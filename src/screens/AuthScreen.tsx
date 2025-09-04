// AuthScreen.tsx
"use client"

import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialIcons } from "@expo/vector-icons"
import { useAuth } from "../../Contexts/AuthContexts"
import { Image } from 'react-native'
import * as LocalAuthentication from "expo-local-authentication"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { profileService } from "../../services/profileService"
import { adminService } from "../../services/adminService"
import TermsAndConditionsModal from "../../components/TermsAndConditionsModal"
import ForgotPasswordModal from "../../components/ForgotPasswordModal"
import { useTheme } from "../../Contexts/ThemeContext"

export default function AuthScreen() {
  const { theme } = useTheme()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")
  const [reportId, setReportId] = useState("")
  const [showUnblockRequest, setShowUnblockRequest] = useState(false)
  const [unblockReason, setUnblockReason] = useState("")

  const { signIn, signUp } = useAuth()

  const handleAuth = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (!email.includes('@')) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return
    }

    // Check terms acceptance for signup
    if (!isLogin && !acceptedTerms) {
      Alert.alert("Terms Required", "Please read and accept the Terms and Conditions to continue.")
      return
    }

    setLoading(true)
    try {
      let result
      if (isLogin) {
        result = await signIn(email.trim(), password)
      } else {
        result = await signUp(email.trim(), password, name.trim())
      }

      if (result.error) {
        // Handle specific Supabase error messages
        let errorMessage = result.error.message
        
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.'
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.'
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Try signing in instead.'
        } else if (errorMessage.includes('Signup requires a valid password')) {
          errorMessage = 'Please enter a valid password (at least 6 characters).'
        } else if (errorMessage.includes('To signup, please provide your email')) {
          errorMessage = 'Please provide a valid email address.'
        }
        
        Alert.alert("Authentication Error", errorMessage)
      } else if (!isLogin && result.data) {
        // Handle successful signup
        if (result.data.user && !result.data.user.email_confirmed_at) {
          Alert.alert(
            "Check Your Email", 
            "We've sent you a confirmation link. Please check your email and click the link to verify your account before signing in.",
            [
              {
                text: "OK",
                onPress: () => {
                  setIsLogin(true) // Switch to login tab
                  setEmail("")
                  setPassword("")
                  setName("")
                  setAcceptedTerms(false) // Reset terms acceptance
                }
              }
            ]
          )
        } else {
          // Email was confirmed immediately (shouldn't happen in most setups)
          Alert.alert("Success", "Account created successfully!")
          setIsLogin(true)
          setEmail("")
          setPassword("")
          setName("")
          setAcceptedTerms(false) // Reset terms acceptance
        }
      } else if (isLogin && result.data) {
        // Check if user is blocked before proceeding
        console.log("Checking if user is blocked:", result.data.user.id, result.data.user.email)
        const blockCheck = await adminService.checkIfUserIsBlocked(result.data.user.id)
        console.log("Block check result:", blockCheck)

        if (blockCheck.isBlocked) {
          console.log("User is blocked, showing blocked screen")
          setIsBlocked(true)
          setBlockReason(blockCheck.reason || "Your account has been blocked")
          setReportId(blockCheck.reportId || "")
          setLoading(false)
          return
        } else {
          console.log("User is not blocked, proceeding with login")
        }

        // After successful login, if user has 2FA enabled, prompt biometric/PIN
        try {
          let twoFactorEnabled = false
          try {
            const current = await profileService.getProfile(result.data.user.id)
            const profile = (current?.data as any)
            twoFactorEnabled = !!(Array.isArray(profile?.profiles) ? profile.profiles[0]?.two_factor_auth : profile?.profiles?.two_factor_auth)
          } catch {}
          if (!twoFactorEnabled) {
            const flag = await AsyncStorage.getItem("twoFactorAuthEnabled")
            twoFactorEnabled = flag === "1"
          }
          if (twoFactorEnabled) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync()
            const supported = await LocalAuthentication.supportedAuthenticationTypesAsync()
            const canAuth = hasHardware && supported && supported.length > 0
            if (canAuth) {
              const attempt = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirm it's you" })
              if (!attempt.success) {
                Alert.alert("Verification failed", "Biometric/PIN verification required.")
                return
              }
            }
          }
        } catch {}
      }
    } catch (error) {
      console.error('Auth error:', error)
      Alert.alert("Error", "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setName("")
    setShowPassword(false)
    setAcceptedTerms(false)
  }

  const switchAuthMode = (loginMode: boolean) => {
    setIsLogin(loginMode)
    resetForm()
  }

  const handleTermsPress = () => {
    setShowTermsModal(true)
  }

  const handleTermsClose = () => {
    setShowTermsModal(false)
  }

  const handleTermsAcceptedFromModal = () => {
    setAcceptedTerms(true)
    setShowTermsModal(false)
  }

  // Simple toggle for checkbox - doesn't show modal
  const toggleCheckbox = () => {
    setAcceptedTerms(!acceptedTerms)
  }

  const handleForgotPasswordPress = () => {
    setShowForgotPasswordModal(true)
  }

  const handleForgotPasswordClose = () => {
    setShowForgotPasswordModal(false)
  }

  const handleUnblockRequest = async () => {
    if (!unblockReason.trim()) {
      Alert.alert("Error", "Please provide a reason for your unblock request")
      return
    }

    setLoading(true)
    try {
      const result = await adminService.createUnblockRequest(reportId, unblockReason.trim())

      if (!result.success) {
        throw new Error(result.error)
      }

      Alert.alert(
        "Request Submitted",
        "Your unblock request has been submitted to the administrators. You will be notified once it's reviewed.",
        [
          {
            text: "OK",
            onPress: () => {
              setIsBlocked(false)
              setShowUnblockRequest(false)
              setUnblockReason("")
              setBlockReason("")
              setReportId("")
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error submitting unblock request:', error)
      Alert.alert("Error", "Failed to submit unblock request. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setIsBlocked(false)
    setShowUnblockRequest(false)
    setUnblockReason("")
    setBlockReason("")
    setReportId("")
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <Image 
                  source={require('../../assets/logo.jpg')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appTitle}>Mirae</Text>
              {/* <Text style={styles.appSubtitle}>SafePlaces</Text> */}
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, isLogin && styles.activeTab]} 
                onPress={() => switchAuthMode(true)}
                disabled={loading}
              >
                <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, !isLogin && styles.activeTab]} 
                onPress={() => switchAuthMode(false)}
                disabled={loading}
              >
                <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {!isLogin && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeIcon}
                  disabled={loading}
                >
                  <MaterialIcons 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>

              {/* Terms and Conditions Checkbox for Sign Up */}
              {!isLogin && (
                <View style={styles.termsContainer}>
                  <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={toggleCheckbox}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms && (
                        <MaterialIcons name="check" size={16} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsTextPrefix}>I agree to the </Text>
                    <TouchableOpacity onPress={handleTermsPress} disabled={loading}>
                      <Text style={styles.termsLink}>Terms and Conditions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Forgot Password Link for Sign In */}
              {isLogin && (
                <TouchableOpacity 
                  onPress={handleForgotPasswordPress} 
                  style={styles.forgotPasswordContainer}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.authButton, 
                  loading && styles.disabledButton,
                  !isLogin && !acceptedTerms && styles.disabledButton
                ]}
                onPress={handleAuth}
                disabled={loading || (!isLogin && !acceptedTerms)}
              >
                <LinearGradient colors={["#000000", "#DAA520"]} style={styles.authButtonGradient}>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.loadingText}>
                        {isLogin ? "Signing In..." : "Creating Account..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.authButtonText}>
                      {isLogin ? "Sign In" : "Sign Up"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={handleTermsClose}
        onAccept={handleTermsAcceptedFromModal}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={handleForgotPasswordClose}
      />
    </SafeAreaView>
  )

  // Render blocked user screen as separate component (outside main SafeAreaView)
  if (isBlocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Blocked User Screen - Full Screen Overlay */}
        <View style={[styles.blockedOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.blockedContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.blockedHeader}>
              <MaterialIcons name="block" size={48} color={theme.colors.error} />
              <Text style={[styles.blockedTitle, { color: theme.colors.text }]}>Account Blocked</Text>
            </View>

            <Text style={[styles.blockedMessage, { color: theme.colors.textSecondary }]}>
              Your account has been blocked by an administrator.
            </Text>

            <Text style={[styles.blockReason, { color: theme.colors.text }]}>
              Reason: {blockReason}
            </Text>

            <Text style={[styles.blockedInfo, { color: theme.colors.textTertiary }]}>
              You can request to be unblocked by providing a reason below. An administrator will review your request.
            </Text>

            <View style={styles.blockedActions}>
              <TouchableOpacity
                style={[styles.requestButton, { backgroundColor: '#007BFF' }]}
                onPress={() => setShowUnblockRequest(true)}
                disabled={loading}
              >
                <Text style={styles.requestButtonText}>Request Unblock</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backButton, { borderColor: theme.colors.border }]}
                onPress={handleBackToLogin}
                disabled={loading}
              >
                <Text style={[styles.backButtonText, { color: theme.colors.text }]}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Unblock Request Modal */}
        {showUnblockRequest && (
          <View style={[styles.blockedOverlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
            <View style={[styles.blockedContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.blockedHeader}>
                <MaterialIcons name="edit" size={48} color="#007BFF" />
                <Text style={[styles.blockedTitle, { color: theme.colors.text }]}>Request Unblock</Text>
              </View>

              <Text style={[styles.blockedMessage, { color: theme.colors.textSecondary }]}>
                Please provide a detailed reason for why you should be unblocked.
              </Text>

              <TextInput
                style={[styles.unblockInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Explain why you should be unblocked..."
                placeholderTextColor={theme.colors.textTertiary}
                value={unblockReason}
                onChangeText={setUnblockReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.blockedActions}>
                <TouchableOpacity
                  style={[styles.requestButton, { backgroundColor: '#28A745' }]}
                  onPress={handleUnblockRequest}
                  disabled={loading || !unblockReason.trim()}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.requestButtonText}>Submit Request</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.backButton, { borderColor: theme.colors.border }]}
                  onPress={() => setShowUnblockRequest(false)}
                  disabled={loading}
                >
                  <Text style={[styles.backButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    )
  }

  // Return main login/signup screen
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <Image
                  source={require('../../assets/logo.jpg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appTitle}>Mirae</Text>
              {/* <Text style={styles.appSubtitle}>SafePlaces</Text> */}
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, isLogin && styles.activeTab]}
                onPress={() => switchAuthMode(true)}
                disabled={loading}
              >
                <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && styles.activeTab]}
                onPress={() => switchAuthMode(false)}
                disabled={loading}
              >
                <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {!isLogin && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={loading}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Terms and Conditions Checkbox for Sign Up */}
              {!isLogin && (
                <View style={styles.termsContainer}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={toggleCheckbox}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms && (
                        <MaterialIcons name="check" size={16} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsTextPrefix}>I agree to the </Text>
                    <TouchableOpacity onPress={handleTermsPress} disabled={loading}>
                      <Text style={styles.termsLink}>Terms and Conditions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Forgot Password Link for Sign In */}
              {isLogin && (
                <TouchableOpacity
                  onPress={handleForgotPasswordPress}
                  style={styles.forgotPasswordContainer}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.authButton,
                  loading && styles.disabledButton,
                  !isLogin && !acceptedTerms && styles.disabledButton
                ]}
                onPress={handleAuth}
                disabled={loading || (!isLogin && !acceptedTerms)}
              >
                <LinearGradient colors={["#000000", "#DAA520"]} style={styles.authButtonGradient}>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="white" />
                      <Text style={styles.loadingText}>
                        {isLogin ? "Signing In..." : "Creating Account..."}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.authButtonText}>
                      {isLogin ? "Sign In" : "Sign Up"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        visible={showTermsModal}
        onClose={handleTermsClose}
        onAccept={handleTermsAcceptedFromModal}
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPasswordModal}
        onClose={handleForgotPasswordClose}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  header: {
    backgroundColor: "#000000",
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logo: {
    width: 80,
    borderRadius: 40,
    height: 80,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 18,
    color: "white",
    textAlign: "center",
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#000000",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 30,
    minHeight: 500,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 30,
    marginBottom: 30,
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#333",
    fontWeight: "bold",
  },
  form: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  eyeIcon: {
    padding: 5,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#DAA520",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#DAA520",
    borderColor: "#DAA520",
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  termsTextPrefix: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  termsLink: {
    fontSize: 14,
    color: "#DAA520",
    textDecorationLine: "underline",
    fontWeight: "500",
    lineHeight: 20,
  },
  authButton: {
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  authButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 55,
  },
  authButtonText: {
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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#DAA520",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  blockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blockedContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  blockedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
  },
  blockedMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  blockReason: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  blockedInfo: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  blockedActions: {
    width: '100%',
    gap: 15,
  },
  requestButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  unblockInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    width: '100%',
    textAlignVertical: 'top',
    marginBottom: 20,
  }
})