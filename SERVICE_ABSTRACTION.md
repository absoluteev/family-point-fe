# Service Abstraction Layer

This document explains how to use the service abstraction layer that allows you to easily switch between Supabase and a dedicated REST API backend without changing frontend code.

## Overview

The service abstraction layer consists of:

- **Service Interfaces**: Define contracts for authentication and data operations
- **Service Implementations**: Concrete implementations for Supabase and REST API
- **Service Factory**: Creates and manages service instances based on configuration
- **Environment Configuration**: Controls which backend to use

## Architecture

```
├── lib/services/
│   ├── types.ts              # Common types and interfaces
│   ├── auth.service.ts       # Authentication service interface and implementations
│   ├── data.service.ts       # Data service interface and implementations
│   └── index.ts              # Service factory and exports
```

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```env
# Service Configuration
# Set to 'supabase' or 'rest-api'
NEXT_PUBLIC_SERVICE_TYPE=supabase

# Supabase Configuration (when using supabase service)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# REST API Configuration (when using rest-api service)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
# NEXT_PUBLIC_API_KEY=your-api-key-here
```

### Switching Between Services

To switch from Supabase to REST API:

1. Change `NEXT_PUBLIC_SERVICE_TYPE` to `rest-api`
2. Uncomment and configure the REST API variables:
   ```env
   NEXT_PUBLIC_SERVICE_TYPE=rest-api
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
   NEXT_PUBLIC_API_KEY=your-api-key-here
   ```
3. Restart your development server

To switch back to Supabase:

1. Change `NEXT_PUBLIC_SERVICE_TYPE` to `supabase`
2. Ensure Supabase credentials are configured
3. Restart your development server

## Service Interfaces

### Authentication Service (IAuthService)

```typescript
interface IAuthService {
  // Session management
  getSession(): Promise<{ user: AuthUser | null }>
  onAuthStateChange(callback: Function): { unsubscribe: () => void }
  
  // Authentication methods
  signIn(email: string, password: string): Promise<ApiResponse<AuthUser>>
  signUp(email: string, password: string, displayName: string, role: UserRole): Promise<ApiResponse<AuthUser>>
  signOut(): Promise<ApiResponse<null>>
  
  // Profile management
  fetchUserProfile(userId: string): Promise<ApiResponse<AuthUser>>
}
```

### Data Service (IDataService)

```typescript
interface IDataService {
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
```

## Usage in Components

### Import Services

```typescript
import { authService, dataService } from '@/lib/services'
import type { AuthUser, Kid, Activity } from '@/lib/services/types'
```

### Authentication Example

```typescript
// Sign in
const handleSignIn = async (email: string, password: string) => {
  const { error } = await authService.signIn(email, password)
  if (error) {
    console.error('Sign in failed:', error)
  }
}

// Get current session
const { user } = await authService.getSession()

// Listen for auth changes
const { unsubscribe } = authService.onAuthStateChange((event, session) => {
  // Handle auth state changes
})
```

### Data Operations Example

```typescript
// Fetch dashboard data
const fetchDashboard = async (familyId: string) => {
  const [kidsResult, statsResult] = await Promise.all([
    dataService.fetchKidsWithPoints(familyId),
    dataService.fetchDashboardStats(familyId)
  ])
  
  if (kidsResult.error) {
    console.error('Error fetching kids:', kidsResult.error)
  } else {
    setKids(kidsResult.data || [])
  }
  
  if (statsResult.error) {
    console.error('Error fetching stats:', statsResult.error)
  } else {
    setStats(statsResult.data)
  }
}

// Create activity
const createActivity = async (activityData: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await dataService.createActivity(activityData)
  if (error) {
    console.error('Error creating activity:', error)
  } else {
    console.log('Activity created:', data)
  }
}
```

## REST API Backend Requirements

When using the REST API service, your backend should implement these endpoints:

### Authentication Endpoints

- `POST /auth/signin` - Sign in user
- `POST /auth/signup` - Sign up user
- `POST /auth/signout` - Sign out user
- `GET /auth/me` - Get current user
- `GET /auth/profile/:userId` - Get user profile

### Data Endpoints

- `GET /families/:familyId/kids-with-points` - Get kids with their points
- `GET /families/:familyId/pending-activities` - Get pending activities
- `GET /families/:familyId/dashboard-stats` - Get dashboard statistics
- `GET /families/:familyId/activities` - Get family activities
- `POST /activities` - Create activity
- `PUT /activities/:id` - Update activity
- `DELETE /activities/:id` - Delete activity
- `GET /families/:familyId/rewards` - Get family rewards
- `POST /rewards` - Create reward
- `PUT /rewards/:id` - Update reward
- `DELETE /rewards/:id` - Delete reward
- `GET /families/:familyId/point-entries` - Get point entries
- `POST /point-entries` - Create point entry
- `PUT /point-entries/:id` - Update point entry
- `POST /point-entries/:id/approve` - Approve/reject point entry
- `GET /families/:familyId/reward-redemptions` - Get reward redemptions
- `POST /reward-redemptions` - Create reward redemption
- `POST /reward-redemptions/:id/approve` - Approve/reject reward redemption

### Response Format

All endpoints should return responses in this format:

```typescript
// Single item response
{
  "data": T | null,
  "error": string | null
}

// List response
{
  "data": T[] | null,
  "error": string | null,
  "count": number // optional
}
```

### Authentication

The REST API service expects JWT token-based authentication:

- Tokens are stored in `localStorage` as `auth_token`
- All API requests include `Authorization: Bearer <token>` header
- Sign in/up endpoints return `{ user: AuthUser, token: string }`

## Benefits

1. **Easy Backend Switching**: Change one environment variable to switch backends
2. **Consistent Interface**: Same API across different backend implementations
3. **Type Safety**: Full TypeScript support with proper typing
4. **Error Handling**: Standardized error response format
5. **Maintainability**: Clean separation of concerns
6. **Testing**: Easy to mock services for testing

## Migration Guide

### From Direct Supabase Usage

1. Replace direct Supabase imports:
   ```typescript
   // Before
   import { supabase } from '@/lib/supabase'
   
   // After
   import { authService, dataService } from '@/lib/services'
   ```

2. Update authentication calls:
   ```typescript
   // Before
   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
   
   // After
   const { data, error } = await authService.signIn(email, password)
   ```

3. Update data operations:
   ```typescript
   // Before
   const { data, error } = await supabase.from('activities').select('*')
   
   // After
   const { data, error } = await dataService.fetchActivities(familyId)
   ```

4. Update auth state listening:
   ```typescript
   // Before
   const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
   
   // After
   const { unsubscribe } = authService.onAuthStateChange(callback)
   ```

### Adding New Operations

1. Add method to appropriate service interface
2. Implement in both Supabase and REST API service classes
3. Add corresponding REST API endpoint documentation
4. Update types if needed

## Troubleshooting

### Common Issues

1. **Service not switching**: Ensure you restart the development server after changing `NEXT_PUBLIC_SERVICE_TYPE`

2. **Missing environment variables**: Check that all required variables are set for your chosen service type

3. **Type errors**: Ensure you're importing types from `@/lib/services/types` instead of Supabase types

4. **Authentication issues with REST API**: Verify that your backend returns the expected token format and handles JWT properly

5. **CORS issues**: Ensure your REST API backend has proper CORS configuration for your frontend domain

### Debug Mode

You can check which service is being used:

```typescript
import { serviceFactory } from '@/lib/services'

console.log('Current service config:', serviceFactory.getConfig())
```