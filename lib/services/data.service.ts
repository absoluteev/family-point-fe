import type { 
  Kid, 
  PendingActivity, 
  DashboardStats, 
  Activity, 
  Reward, 
  PointEntry, 
  RewardRedemption,
  ApiResponse,
  ApiListResponse
} from './types'

// Data service interface
export interface IDataService {
  // Dashboard operations
  fetchKidsWithPoints(familyId: string): Promise<ApiListResponse<Kid>>
  fetchPendingActivities(familyId: string): Promise<ApiListResponse<PendingActivity>>
  fetchDashboardStats(familyId: string): Promise<ApiResponse<DashboardStats>>
  
  // Activity operations
  fetchActivities(familyId: string): Promise<ApiListResponse<Activity>>
  createActivity(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Activity>>
  updateActivity(id: string, updates: Partial<Activity>): Promise<ApiResponse<Activity>>
  deleteActivity(id: string): Promise<ApiResponse<null>>
  
  // Reward operations
  fetchRewards(familyId: string): Promise<ApiListResponse<Reward>>
  createReward(reward: Omit<Reward, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Reward>>
  updateReward(id: string, updates: Partial<Reward>): Promise<ApiResponse<Reward>>
  deleteReward(id: string): Promise<ApiResponse<null>>
  
  // Point entry operations
  fetchPointEntries(familyId: string, userId?: string): Promise<ApiListResponse<PointEntry>>
  createPointEntry(entry: Omit<PointEntry, 'id' | 'created_at'>): Promise<ApiResponse<PointEntry>>
  updatePointEntry(id: string, updates: Partial<PointEntry>): Promise<ApiResponse<PointEntry>>
  approvePointEntry(id: string, approved: boolean, approvedBy: string): Promise<ApiResponse<PointEntry>>
  
  // Reward redemption operations
  fetchRewardRedemptions(familyId: string, userId?: string): Promise<ApiListResponse<RewardRedemption>>
  createRewardRedemption(redemption: Omit<RewardRedemption, 'id' | 'created_at'>): Promise<ApiResponse<RewardRedemption>>
  approveRewardRedemption(id: string, approved: boolean, approvedBy: string): Promise<ApiResponse<RewardRedemption>>
}

// Supabase implementation
export class SupabaseDataService implements IDataService {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  async fetchKidsWithPoints(familyId: string): Promise<ApiListResponse<Kid>> {
    try {
      const { data: kidsData, error } = await this.supabase
        .from("user_profiles")
        .select(`
          user_id,
          display_name,
          point_entries!inner(
            points
          )
        `)
        .eq("family_id", familyId)
        .eq("role", "kid")
        .eq("point_entries.status", "approved")

      if (error) throw error

      const kids: Kid[] = kidsData?.map((kid: any) => ({
        id: kid.user_id,
        display_name: kid.display_name,
        total_points: kid.point_entries?.reduce((sum: number, entry: any) => sum + entry.points, 0) || 0
      })) || []

      return { data: kids, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchPendingActivities(familyId: string): Promise<ApiListResponse<PendingActivity>> {
    try {
      const { data: pendingData, error } = await this.supabase
        .from("point_entries")
        .select(`
          id,
          points,
          created_at,
          activities(name),
          user_profiles(display_name)
        `)
        .eq("family_id", familyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (error) throw error

      const activities: PendingActivity[] = pendingData?.map((entry: any) => ({
        id: entry.id,
        activity_name: entry.activities?.name || 'Unknown Activity',
        kid_name: entry.user_profiles?.display_name || 'Unknown Kid',
        points: entry.points,
        submitted_at: entry.created_at
      })) || []

      return { data: activities, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchDashboardStats(familyId: string): Promise<ApiResponse<DashboardStats>> {
    try {
      const [kidsCount, activitiesCount, rewardsCount, pendingCount] = await Promise.all([
        this.supabase.from("user_profiles").select("id", { count: "exact" }).eq("family_id", familyId).eq("role", "kid"),
        this.supabase.from("activities").select("id", { count: "exact" }).eq("family_id", familyId),
        this.supabase.from("rewards").select("id", { count: "exact" }).eq("family_id", familyId),
        this.supabase.from("point_entries").select("id", { count: "exact" }).eq("family_id", familyId).eq("status", "pending")
      ])

      const stats: DashboardStats = {
        totalKids: kidsCount.count || 0,
        totalActivities: activitiesCount.count || 0,
        totalRewards: rewardsCount.count || 0,
        pendingApprovals: pendingCount.count || 0
      }

      return { data: stats, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchActivities(familyId: string): Promise<ApiListResponse<Activity>> {
    try {
      const { data, error } = await this.supabase
        .from("activities")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async createActivity(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Activity>> {
    try {
      const { data, error } = await this.supabase
        .from("activities")
        .insert(activity)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<ApiResponse<Activity>> {
    try {
      const { data, error } = await this.supabase
        .from("activities")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async deleteActivity(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.supabase
        .from("activities")
        .delete()
        .eq("id", id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchRewards(familyId: string): Promise<ApiListResponse<Reward>> {
    try {
      const { data, error } = await this.supabase
        .from("rewards")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async createReward(reward: Omit<Reward, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Reward>> {
    try {
      const { data, error } = await this.supabase
        .from("rewards")
        .insert(reward)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async updateReward(id: string, updates: Partial<Reward>): Promise<ApiResponse<Reward>> {
    try {
      const { data, error } = await this.supabase
        .from("rewards")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async deleteReward(id: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.supabase
        .from("rewards")
        .delete()
        .eq("id", id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchPointEntries(familyId: string, userId?: string): Promise<ApiListResponse<PointEntry>> {
    try {
      let query = this.supabase
        .from("point_entries")
        .select("*")
        .eq("family_id", familyId)

      if (userId) {
        query = query.eq("user_id", userId)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async createPointEntry(entry: Omit<PointEntry, 'id' | 'created_at'>): Promise<ApiResponse<PointEntry>> {
    try {
      const { data, error } = await this.supabase
        .from("point_entries")
        .insert(entry)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async updatePointEntry(id: string, updates: Partial<PointEntry>): Promise<ApiResponse<PointEntry>> {
    try {
      const { data, error } = await this.supabase
        .from("point_entries")
        .update(updates)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async approvePointEntry(id: string, approved: boolean, approvedBy: string): Promise<ApiResponse<PointEntry>> {
    try {
      const { data, error } = await this.supabase
        .from("point_entries")
        .update({
          status: approved ? "approved" : "rejected",
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchRewardRedemptions(familyId: string, userId?: string): Promise<ApiListResponse<RewardRedemption>> {
    try {
      let query = this.supabase
        .from("reward_redemptions")
        .select("*")
        .eq("family_id", familyId)

      if (userId) {
        query = query.eq("user_id", userId)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async createRewardRedemption(redemption: Omit<RewardRedemption, 'id' | 'created_at'>): Promise<ApiResponse<RewardRedemption>> {
    try {
      const { data, error } = await this.supabase
        .from("reward_redemptions")
        .insert(redemption)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async approveRewardRedemption(id: string, approved: boolean, approvedBy: string): Promise<ApiResponse<RewardRedemption>> {
    try {
      const { data, error } = await this.supabase
        .from("reward_redemptions")
        .update({
          status: approved ? "approved" : "rejected",
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }
}

// REST API implementation
export class RestApiDataService implements IDataService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

  private async apiListCall<T>(endpoint: string, options: RequestInit = {}): Promise<ApiListResponse<T>> {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })

      const result = await response.json()
      
      if (!response.ok) {
        return { data: null, error: result.message || 'API request failed' }
      }

      return { data: result.data, error: null, count: result.count }
    } catch (error: any) {
      return { data: null, error: error.message }
    }
  }

  async fetchKidsWithPoints(familyId: string): Promise<ApiListResponse<Kid>> {
    return await this.apiListCall<Kid>(`/families/${familyId}/kids-with-points`)
  }

  async fetchPendingActivities(familyId: string): Promise<ApiListResponse<PendingActivity>> {
    return await this.apiListCall<PendingActivity>(`/families/${familyId}/pending-activities`)
  }

  async fetchDashboardStats(familyId: string): Promise<ApiResponse<DashboardStats>> {
    return await this.apiCall<DashboardStats>(`/families/${familyId}/dashboard-stats`)
  }

  async fetchActivities(familyId: string): Promise<ApiListResponse<Activity>> {
    return await this.apiListCall<Activity>(`/families/${familyId}/activities`)
  }

  async createActivity(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Activity>> {
    return await this.apiCall<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    })
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<ApiResponse<Activity>> {
    return await this.apiCall<Activity>(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteActivity(id: string): Promise<ApiResponse<null>> {
    return await this.apiCall<null>(`/activities/${id}`, {
      method: 'DELETE',
    })
  }

  async fetchRewards(familyId: string): Promise<ApiListResponse<Reward>> {
    return await this.apiListCall<Reward>(`/families/${familyId}/rewards`)
  }

  async createReward(reward: Omit<Reward, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Reward>> {
    return await this.apiCall<Reward>('/rewards', {
      method: 'POST',
      body: JSON.stringify(reward),
    })
  }

  async updateReward(id: string, updates: Partial<Reward>): Promise<ApiResponse<Reward>> {
    return await this.apiCall<Reward>(`/rewards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteReward(id: string): Promise<ApiResponse<null>> {
    return await this.apiCall<null>(`/rewards/${id}`, {
      method: 'DELETE',
    })
  }

  async fetchPointEntries(familyId: string, userId?: string): Promise<ApiListResponse<PointEntry>> {
    const endpoint = userId 
      ? `/families/${familyId}/point-entries?user_id=${userId}`
      : `/families/${familyId}/point-entries`
    return await this.apiListCall<PointEntry>(endpoint)
  }

  async createPointEntry(entry: Omit<PointEntry, 'id' | 'created_at'>): Promise<ApiResponse<PointEntry>> {
    return await this.apiCall<PointEntry>('/point-entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    })
  }

  async updatePointEntry(id: string, updates: Partial<PointEntry>): Promise<ApiResponse<PointEntry>> {
    return await this.apiCall<PointEntry>(`/point-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async approvePointEntry(id: string, approved: boolean, approvedBy: string): Promise<ApiResponse<PointEntry>> {
    return await this.apiCall<PointEntry>(`/point-entries/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, approvedBy }),
    })
  }

  async fetchRewardRedemptions(familyId: string, userId?: string): Promise<ApiListResponse<RewardRedemption>> {
    const endpoint = userId 
      ? `/families/${familyId}/reward-redemptions?user_id=${userId}`
      : `/families/${familyId}/reward-redemptions`
    return await this.apiListCall<RewardRedemption>(endpoint)
  }

  async createRewardRedemption(redemption: Omit<RewardRedemption, 'id' | 'created_at'>): Promise<ApiResponse<RewardRedemption>> {
    return await this.apiCall<RewardRedemption>('/reward-redemptions', {
      method: 'POST',
      body: JSON.stringify(redemption),
    })
  }

  async approveRewardRedemption(id: string, approved: boolean, approvedBy: string): Promise<ApiResponse<RewardRedemption>> {
    return await this.apiCall<RewardRedemption>(`/reward-redemptions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, approvedBy }),
    })
  }
}