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

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
        }
      } else if (isLogin && result.data) {
        // Successful login - the context will handle the user state update
        console.log('Login successful')
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
  }

  const switchAuthMode = (loginMode: boolean) => {
    setIsLogin(loginMode)
    resetForm()
  }

  return (
    <SafeAreaView style={styles.container}>
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
                  source={require('../../assets/logoM.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appTitle}>Mirae App</Text>
              <Text style={styles.appSubtitle}>SafePlaces</Text>
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

              <TouchableOpacity
                style={[styles.authButton, loading && styles.disabledButton]}
                onPress={handleAuth}
                disabled={loading}
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

              <Text style={styles.termsText}>
                By continuing, you agree to create a safe and inclusive space for the LGBTQ+ community
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    opacity: 0.7,
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
  termsText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
})