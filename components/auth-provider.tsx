"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

type UserRole = "parent" | "kid" | "admin"

interface AuthUser extends User {
  role?: UserRole
  family_id?: string
  display_name?: string
}

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
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (mounted) {
          if (session?.user) {
            await fetchUserProfile(session.user)
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        await fetchUserProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role, family_id, display_name")
        .eq("user_id", authUser.id)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found"
        throw error
      }

      setUser({
        ...authUser,
        role: profile?.role,
        family_id: profile?.family_id,
        display_name: profile?.display_name,
      })
    } catch (error) {
      console.error("Error fetching user profile:", error)
      // Set user without profile data if profile fetch fails
      setUser(authUser as AuthUser)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, displayName: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: role,
        },
      },
    })
    if (error) throw error

    if (data.user) {
      // Create user profile
      const { error: profileError } = await supabase.from("user_profiles").insert({
        user_id: data.user.id,
        email,
        display_name: displayName,
        role,
        family_id: role === "parent" ? data.user.id : null, // Parent creates their own family
      })

      if (profileError) throw profileError

      // If parent, create family record
      if (role === "parent") {
        const { error: familyError } = await supabase.from("families").insert({
          id: data.user.id,
          name: `${displayName}'s Family`,
          created_by: data.user.id,
        })

        if (familyError) throw familyError
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
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
