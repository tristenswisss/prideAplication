"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { auth } from "../lib/auth"
import type { UserProfile } from "../types/social"


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
  loading:boolean
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
  }, [])

  const checkUser = async () => {
    try {
      const { data } = await auth.getCurrentUser()
      setUser(data.user ? mapUserToUserProfile(data.user) : null)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const result = await auth.signUp(email, password, name)
    if (result.data?.user) {
      setUser(mapUserToUserProfile(result.data.user))
    }
    return result
  }

  const signIn = async (email: string, password: string) => {
    const result = await auth.signIn(email, password)
    if (result.data?.user) {
      setUser(mapUserToUserProfile(result.data.user))
    }
    return result
  }

  const signOut = async () => {
    const result = await auth.signOut()
    if (!result.error) {
      setUser(null)
    }
    return result
  }

  // Helper to map User to UserProfile
  function mapUserToUserProfile(user: User): UserProfile {
    return {
    ...user,
    interests: [],
    verified: false,
    follower_count: 0,
    following_count: 0,
    avatar_url: "",
    bio: "",
    post_count: 0,
    created_at: "",
    updated_at: ""
}
  }

  const value: AuthContextType = {
      user,
      signUp,
      signIn,
      signOut,
      loading: false
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
