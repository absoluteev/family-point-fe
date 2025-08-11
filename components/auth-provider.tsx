"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { authService } from "@/lib/services"
import type { AuthUser, UserRole } from "@/lib/services/types"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { user: sessionUser } = await authService.getSession()
        if (mounted) {
          if (sessionUser) {
            await fetchUserProfile(sessionUser.id)
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { unsubscribe } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await authService.fetchUserProfile(userId)

      if (error) {
        console.error("Error fetching user profile:", error)
        // Set basic user data if profile fetch fails
        setUser({ id: userId })
      } else {
        setUser(profile)
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      // Set basic user data if profile fetch fails
      setUser({ id: userId })
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.signIn(email, password)
    if (error) throw new Error(error)
  }

  const signUp = async (email: string, password: string, displayName: string, role: UserRole) => {
    const { error } = await authService.signUp(email, password, displayName, role)
    if (error) throw new Error(error)
  }

  const signOut = async () => {
    const { error } = await authService.signOut()
    if (error) throw new Error(error)
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
