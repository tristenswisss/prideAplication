import AsyncStorage from "@react-native-async-storage/async-storage"

interface User {
  id: string
  email: string
  name: string
  created_at: string
}

// Simple mock authentication
export const auth = {
  signUp: async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ data: { user: User } | null; error: any }> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Basic validation
      if (!email.includes("@")) {
        return { data: null, error: { message: "Invalid email address" } }
      }

      if (password.length < 6) {
        return { data: null, error: { message: "Password must be at least 6 characters" } }
      }

      // Create mock user
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        created_at: new Date().toISOString(),
      }

      // Store user data
      await AsyncStorage.setItem("user", JSON.stringify(user))
      await AsyncStorage.setItem("isAuthenticated", "true")

      return { data: { user }, error: null }
    } catch (error) {
      return { data: null, error: { message: "Sign up failed" } }
    }
  },

  signIn: async (email: string, password: string): Promise<{ data: { user: User } | null; error: any }> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Basic validation
      if (!email.includes("@")) {
        return { data: null, error: { message: "Invalid email address" } }
      }

      // Create mock user (in real app, this would validate credentials)
      const user: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name: email.split("@")[0],
        created_at: new Date().toISOString(),
      }

      // Store user data
      await AsyncStorage.setItem("user", JSON.stringify(user))
      await AsyncStorage.setItem("isAuthenticated", "true")

      return { data: { user }, error: null }
    } catch (error) {
      return { data: null, error: { message: "Sign in failed" } }
    }
  },

  signOut: async (): Promise<{ error: any }> => {
    try {
      await AsyncStorage.removeItem("user")
      await AsyncStorage.removeItem("isAuthenticated")
      return { error: null }
    } catch (error) {
      return { error: { message: "Sign out failed" } }
    }
  },

  getCurrentUser: async (): Promise<{ data: { user: User | null }; error: any }> => {
    try {
      const isAuthenticated = await AsyncStorage.getItem("isAuthenticated")
      if (!isAuthenticated) {
        return { data: { user: null }, error: null }
      }

      const userStr = await AsyncStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        return { data: { user }, error: null }
      }

      return { data: { user: null }, error: null }
    } catch (error) {
      return { data: { user: null }, error: { message: "Failed to get user" } }
    }
  },
}
