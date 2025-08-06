// supabaseConfig.ts
import "react-native-url-polyfill/auto"
import { createClient } from "@supabase/supabase-js"
import AsyncStorage from "@react-native-async-storage/async-storage"

const supabaseUrl = "https://pvvkdtlkjulvutzyzaxb.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dmtkdGxranVsdnV0enl6YXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NzI2NzIsImV4cCI6MjA3MDA0ODY3Mn0.xDn8Wyq_hVwC6gUwaRn94Nt6VKAYWowEju6AQWBvhKI"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Proper Supabase authentication functions
export const auth = {
  signUp: async (email: string, password: string, name: string) => {
    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name, // Store the name in user metadata
          }
        }
      })

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: "An unexpected error occurred during sign up" }
      }
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: { message: "An unexpected error occurred during sign in" }
      }
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error: { message: "An unexpected error occurred during sign out" } }
    }
  },

  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      return { data: { user }, error }
    } catch (error) {
      return {
        data: { user: null },
        error: { message: "Failed to get current user" }
      }
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}