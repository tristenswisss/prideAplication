import "react-native-url-polyfill/auto"
import { createClient } from "@supabase/supabase-js"
import AsyncStorage from "@react-native-async-storage/async-storage"

// For now, we'll use placeholder values - you can replace these with real Supabase credentials later
const supabaseUrl = "https://oznfudvuwgnlwtrqnjsa.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bmZ1ZHZ1d2dubHd0cnFuanNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MzQ3ODIsImV4cCI6MjA2OTAxMDc4Mn0.p1vElTKfycST1H7PRIBCcxSl3SFnWZKxHlUaZhNLrE0"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Mock authentication functions for development
export const mockAuth = {
  signUp: async (email: string, password: string, name: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock successful signup
    const mockUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      created_at: new Date().toISOString(),
    }

    // Store in AsyncStorage for persistence
    await AsyncStorage.setItem("user", JSON.stringify(mockUser))

    return { data: { user: mockUser }, error: null }
  },

  signIn: async (email: string, password: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock successful signin
    const mockUser = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: email.split("@")[0],
      created_at: new Date().toISOString(),
    }

    // Store in AsyncStorage for persistence
    await AsyncStorage.setItem("user", JSON.stringify(mockUser))

    return { data: { user: mockUser, session: { user: mockUser } }, error: null }
  },

  signOut: async () => {
    await AsyncStorage.removeItem("user")
    return { error: null }
  },

  getUser: async () => {
    const userStr = await AsyncStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      return { data: { user }, error: null }
    }
    return { data: { user: null }, error: null }
  },
}
