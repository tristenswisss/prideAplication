"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth, supabase } from "../lib/supabase"
import { profileService } from "../services/profileService"
import { messagingService } from "../services/messagingService"

interface User {
  id: string
  email?: string
  name: string
  avatar_url?: string
  user_metadata?: {
    full_name?: string
  }
  email_confirmed_at?: string
  [key: string]: any
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setLoading(true)
      try {
        const {
          data: { user },
          error,
        } = await auth.getCurrentUser()
        if (!error && user) {
          try {
            const result = await profileService.getProfile(user.id)
            if (result.success && result.data) {
              const dbUser: any = result.data
              const profile = Array.isArray((dbUser as any).profiles) ? (dbUser as any).profiles[0] : (dbUser as any).profiles
              setUser({
                ...dbUser,
                username: profile?.username,
                show_profile: profile?.show_profile,
                show_activities: profile?.show_activities,
                appear_in_search: profile?.appear_in_search,
                allow_direct_messages: profile?.allow_direct_messages,
                name: dbUser.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
              })
            } else {
              setUser({
                ...user,
                name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
              })
            }
          } catch (e) {
            setUser({
              ...user,
              name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            })
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)

      if (event === "SIGNED_IN" && session?.user) {
        try {
          const result = await profileService.getProfile(session.user.id)
          if (result.success && result.data) {
            const dbUser: any = result.data
            const profile = Array.isArray((dbUser as any).profiles) ? (dbUser as any).profiles[0] : (dbUser as any).profiles
            setUser({
              ...dbUser,
              username: profile?.username,
              show_profile: profile?.show_profile,
              show_activities: profile?.show_activities,
              appear_in_search: profile?.appear_in_search,
              allow_direct_messages: profile?.allow_direct_messages,
              name: dbUser.name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            })
          } else {
            setUser({
              ...session.user,
              name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            })
          }
          // mark online
          await messagingService.updateOnlineStatus(session.user.id, true)
        } catch (e) {
          setUser({
            ...session.user,
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          })
        }
      } else if (event === "SIGNED_OUT" || !session?.user) {
        if (user?.id) {
          await messagingService.updateOnlineStatus(user.id, false)
        }
        setUser(null)
      } else if (session?.user) {
        try {
          const result = await profileService.getProfile(session.user.id)
          if (result.success && result.data) {
            const dbUser: any = result.data
            const profile = Array.isArray((dbUser as any).profiles) ? (dbUser as any).profiles[0] : (dbUser as any).profiles
            setUser({
              ...dbUser,
              username: profile?.username,
              show_profile: profile?.show_profile,
              show_activities: profile?.show_activities,
              appear_in_search: profile?.appear_in_search,
              allow_direct_messages: profile?.allow_direct_messages,
              name: dbUser.name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            })
          } else {
            setUser({
              ...session.user,
              name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            })
          }
        } catch (e) {
          setUser({
            ...session.user,
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          })
        }
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Realtime subscription when user changes
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`user-updates:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${user.id}` },
        async () => {
          await refreshUser()
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        async () => {
          await refreshUser()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await auth.signUp(email, password, name)
      return result
    } catch (error) {
      return {
        data: null,
        error: { message: "An unexpected error occurred during sign up" },
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await auth.signIn(email, password)
      return result
    } catch (error) {
      return {
        data: null,
        error: { message: "An unexpected error occurred during sign in" },
      }
    }
  }

  const signOut = async () => {
    try {
      if (user?.id) {
        await messagingService.updateOnlineStatus(user.id, false)
      }
      const result = await auth.signOut()
      setUser(null)
      return result
    } catch (error) {
      return { error: { message: "An unexpected error occurred during sign out" } }
    }
  }

  const refreshUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await auth.getCurrentUser()
      if (!error && user) {
        try {
          const result = await profileService.getProfile(user.id)
          if (result.success && result.data) {
            const dbUser: any = result.data
            const profile = Array.isArray((dbUser as any).profiles) ? (dbUser as any).profiles[0] : (dbUser as any).profiles
            setUser({
              ...dbUser,
              username: profile?.username,
              show_profile: profile?.show_profile,
              show_activities: profile?.show_activities,
              appear_in_search: profile?.appear_in_search,
              allow_direct_messages: profile?.allow_direct_messages,
              name: dbUser.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            })
          } else {
            setUser({
              ...user,
              name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            })
          }
        } catch (e) {
          setUser({
            ...user,
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          })
        }
      } else if (error) {
        console.error("Error refreshing user:", error)
      }
    } catch (error) {
      console.error("Error refreshing user:", error)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
