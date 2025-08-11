// Common types for all services
export type UserRole = "parent" | "kid" | "admin"

export interface AuthUser {
  id: string
  email?: string
  role?: UserRole
  family_id?: string
  display_name?: string
  created_at?: string
  updated_at?: string
}

export interface Kid {
  id: string
  display_name: string
  total_points: number
}

export interface PendingActivity {
  id: string
  activity_name: string
  kid_name: string
  points: number
  submitted_at: string
}

export interface DashboardStats {
  totalKids: number
  totalActivities: number
  totalRewards: number
  pendingApprovals: number
}

export interface Activity {
  id: string
  name: string
  description?: string
  points: number
  category?: string
  family_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  name: string
  description?: string
  points_required: number
  family_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface PointEntry {
  id: string
  family_id: string
  user_id: string
  activity_id?: string
  points: number
  description?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
}

export interface RewardRedemption {
  id: string
  family_id: string
  user_id: string
  reward_id: string
  points_spent: number
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
}

export interface Family {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  email: string
  display_name: string
  role: UserRole
  family_id?: string
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface ApiListResponse<T> {
  data: T[] | null
  error: string | null
  count?: number
}

// Service configuration
export interface ServiceConfig {
  type: 'supabase' | 'rest-api'
  baseUrl?: string
  apiKey?: string
}