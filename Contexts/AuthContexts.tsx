"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "../lib/supabase"
import type { UserProfile } from "../types/social"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface User {
  id: string
  email: string
  name: string
  created_at: string
}

interface AuthContextType {
  user: UserProfile | null
  signUp: (email: string, password: string, name: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapUserToUserProfile(session.user as any))
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(mapUserToUserProfile(session.user as any))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (error) {
        return { data: null, error }
      }

      if (data.user) {
        setUser(mapUserToUserProfile(data.user as any))
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: { message: "Sign up failed" } }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { data: null, error }
      }

      if (data.user) {
        setUser(mapUserToUserProfile(data.user as any))
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: { message: "Sign in failed" } }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        setUser(null)
      }
      return { error }
    } catch (error) {
      return { error: { message: "Sign out failed" } }
    }
  }

  // Helper to map User to UserProfile
  function mapUserToUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.email?.split("@")[0] || "",
      interests: [],
      verified: false,
      follower_count: 0,
      following_count: 0,
      avatar_url: "",
      bio: "",
      post_count: 0,
      created_at: user.created_at || "",
      updated_at: user.updated_at || ""
    }
  }

  const value: AuthContextType = {
    user,
    signUp,
    signIn,
    signOut,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
