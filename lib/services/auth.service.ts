import type { AuthUser, UserRole, ApiResponse } from './types'

// Authentication service interface
export interface IAuthService {
  // Session management
  getSession(): Promise<{ user: AuthUser | null }>
  onAuthStateChange(callback: (event: string, session: { user: AuthUser | null } | null) => void): { unsubscribe: () => void }
  
  // Authentication methods
  signIn(email: string, password: string): Promise<ApiResponse<AuthUser>>
  signUp(email: string, password: string, displayName: string, role: UserRole): Promise<ApiResponse<AuthUser>>
  signOut(): Promise<ApiResponse<null>>
  
  // Profile management
  fetchUserProfile(userId: string): Promise<ApiResponse<AuthUser>>
}

// Supabase implementation
export class SupabaseAuthService implements IAuthService {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  async getSession(): Promise<{ user: AuthUser | null }> {
    const { data: { session } } = await this.supabase.auth.getSession()
    return { user: session?.user || null }
  }

  onAuthStateChange(callback: (event: string, session: { user: AuthUser | null } | null) => void): { unsubscribe: () => void } {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(callback)
    return { unsubscribe: () => subscription.unsubscribe() }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { data: data.user, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async signUp(email: string, password: string, displayName: string, role: UserRole): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
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
        const { error: profileError } = await this.supabase.from("user_profiles").insert({
          user_id: data.user.id,
          email,
          display_name: displayName,
          role,
          family_id: role === "parent" ? data.user.id : null,
        })

        if (profileError) throw profileError

        // If parent, create family record
        if (role === "parent") {
          const { error: familyError } = await this.supabase.from("families").insert({
            id: data.user.id,
            name: `${displayName}'s Family`,
            created_by: data.user.id,
          })

          if (familyError) throw familyError
        }
      }

      return { data: data.user, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async signOut(): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.supabase.auth.signOut()
      if (error) throw error
      return { data: null, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchUserProfile(userId: string): Promise<ApiResponse<AuthUser>> {
    try {
      const { data: profile, error } = await this.supabase
        .from("user_profiles")
        .select("role, family_id, display_name")
        .eq("user_id", userId)
        .single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      return {
        data: {
          id: userId,
          role: profile?.role,
          family_id: profile?.family_id,
          display_name: profile?.display_name,
        },
        error: null
      }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }
}

// REST API implementation
export class RestApiAuthService implements IAuthService {
  private baseUrl: string
  private apiKey: string
  private authStateCallbacks: Array<(event: string, session: { user: AuthUser | null } | null) => void> = []

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        return { data: null, error: result.message || 'API request failed' }
      }

      return { data: result.data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async getSession(): Promise<{ user: AuthUser | null }> {
    const token = localStorage.getItem('auth_token')
    if (!token) return { user: null }

    const result = await this.apiCall<AuthUser>('/auth/me')
    return { user: result.data }
  }

  onAuthStateChange(callback: (event: string, session: { user: AuthUser | null } | null) => void): { unsubscribe: () => void } {
    this.authStateCallbacks.push(callback)
    return {
      unsubscribe: () => {
        const index = this.authStateCallbacks.indexOf(callback)
        if (index > -1) {
          this.authStateCallbacks.splice(index, 1)
        }
      }
    }
  }

  private notifyAuthStateChange(event: string, session: { user: AuthUser | null } | null) {
    this.authStateCallbacks.forEach(callback => callback(event, session))
  }

  async signIn(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    const result = await this.apiCall<{ user: AuthUser, token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (result.data) {
      localStorage.setItem('auth_token', result.data.token)
      this.notifyAuthStateChange('SIGNED_IN', { user: result.data.user })
      return { data: result.data.user, error: null }
    }

    return { data: null, error: result.error }
  }

  async signUp(email: string, password: string, displayName: string, role: UserRole): Promise<ApiResponse<AuthUser>> {
    const result = await this.apiCall<{ user: AuthUser, token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role }),
    })

    if (result.data) {
      localStorage.setItem('auth_token', result.data.token)
      this.notifyAuthStateChange('SIGNED_UP', { user: result.data.user })
      return { data: result.data.user, error: null }
    }

    return { data: null, error: result.error }
  }

  async signOut(): Promise<ApiResponse<null>> {
    localStorage.removeItem('auth_token')
    this.notifyAuthStateChange('SIGNED_OUT', null)
    return { data: null, error: null }
  }

  async fetchUserProfile(userId: string): Promise<ApiResponse<AuthUser>> {
    return await this.apiCall<AuthUser>(`/auth/profile/${userId}`)
  }
}