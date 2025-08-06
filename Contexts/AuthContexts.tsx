// AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../lib/supabase'

interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
  email_confirmed_at?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
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
        const { data: { user }, error } = await auth.getCurrentUser()
        if (!error && user) {
          setUser(user)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
      } else if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
      } else if (session?.user) {
        setUser(session.user)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await auth.signUp(email, password, name)
      return result
    } catch (error) {
      return {
        data: null,
        error: { message: 'An unexpected error occurred during sign up' }
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
        error: { message: 'An unexpected error occurred during sign in' }
      }
    }
  }

  const signOut = async () => {
    try {
      const result = await auth.signOut()
      setUser(null)
      return result
    } catch (error) {
      return { error: { message: 'An unexpected error occurred during sign out' } }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}