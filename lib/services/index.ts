import type { ServiceConfig } from './types'
import { IAuthService, SupabaseAuthService, RestApiAuthService } from './auth.service'
import { IDataService, SupabaseDataService, RestApiDataService } from './data.service'

// Service configuration from environment variables
const getServiceConfig = (): ServiceConfig => {
  const serviceType = process.env.NEXT_PUBLIC_SERVICE_TYPE as 'supabase' | 'rest-api' || 'supabase'
  
  return {
    type: serviceType,
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    apiKey: process.env.NEXT_PUBLIC_API_KEY,
  }
}

// Create Supabase client only when needed and properly configured
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'your-supabase-url-here' || 
      supabaseAnonKey === 'your-supabase-anon-key-here') {
    throw new Error('Supabase configuration is missing or using placeholder values. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.')
  }
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Service factory class
class ServiceFactory {
  private static instance: ServiceFactory
  private config: ServiceConfig
  private authService: IAuthService | null = null
  private dataService: IDataService | null = null

  private constructor() {
    this.config = getServiceConfig()
  }

  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  public getAuthService(): IAuthService {
    if (!this.authService) {
      switch (this.config.type) {
        case 'supabase':
          const supabaseClient = createSupabaseClient()
          this.authService = new SupabaseAuthService(supabaseClient)
          break
        case 'rest-api':
          if (!this.config.baseUrl || !this.config.apiKey) {
            throw new Error('REST API configuration missing: baseUrl and apiKey are required')
          }
          this.authService = new RestApiAuthService(this.config.baseUrl, this.config.apiKey)
          break
        default:
          throw new Error(`Unsupported service type: ${this.config.type}`)
      }
    }
    return this.authService
  }

  public getDataService(): IDataService {
    if (!this.dataService) {
      switch (this.config.type) {
        case 'supabase':
          const supabaseClient = createSupabaseClient()
          this.dataService = new SupabaseDataService(supabaseClient)
          break
        case 'rest-api':
          if (!this.config.baseUrl || !this.config.apiKey) {
            throw new Error('REST API configuration missing: baseUrl and apiKey are required')
          }
          this.dataService = new RestApiDataService(this.config.baseUrl, this.config.apiKey)
          break
        default:
          throw new Error(`Unsupported service type: ${this.config.type}`)
      }
    }
    return this.dataService
  }

  public getConfig(): ServiceConfig {
    return this.config
  }

  // Method to reset services (useful for testing or config changes)
  public reset(): void {
    this.authService = null
    this.dataService = null
    this.config = getServiceConfig()
  }
}

// Export singleton instance and services
export const serviceFactory = ServiceFactory.getInstance()
export const authService = serviceFactory.getAuthService()
export const dataService = serviceFactory.getDataService()

// Export types and interfaces
export type { IAuthService, IDataService, ServiceConfig }
export * from './types'