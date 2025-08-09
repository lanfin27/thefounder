// Supabase utility functions and helpers

import { createClient } from '@supabase/supabase-js'
import type { FlippaListing, ScrapingSession } from './types'

// Create Supabase client for server-side use
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

// Create Supabase client for client-side use
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Database query helpers
export const db = {
  // Flippa listings queries
  listings: {
    async getAll(limit = 100) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('flippa_listings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data as FlippaListing[]
    },

    async getById(id: number) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('flippa_listings')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as FlippaListing
    },

    async getByCategory(category: string, limit = 100) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('flippa_listings')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data as FlippaListing[]
    },

    async search(query: string, limit = 50) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('flippa_listings')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit)
      
      if (error) throw error
      return data as FlippaListing[]
    },

    async getStats() {
      const supabase = createServerClient()
      
      // Get total count
      const { count } = await supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true })
      
      // Get category counts
      const { data: categories } = await supabase
        .from('flippa_listings')
        .select('category')
        .not('category', 'is', null)
      
      const categoryCounts = categories?.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
      
      return {
        total: count || 0,
        byCategory: categoryCounts,
        categoryCount: Object.keys(categoryCounts).length
      }
    }
  },

  // Scraping sessions queries
  sessions: {
    async getAll(limit = 100) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('scraping_sessions')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data as ScrapingSession[]
    },

    async getLatest() {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('scraping_sessions')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data as ScrapingSession | null
    },

    async create(session: Partial<ScrapingSession>) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('scraping_sessions')
        .insert(session)
        .select()
        .single()
      
      if (error) throw error
      return data as ScrapingSession
    },

    async update(sessionId: string, updates: Partial<ScrapingSession>) {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('scraping_sessions')
        .update(updates)
        .eq('session_id', sessionId)
        .select()
        .single()
      
      if (error) throw error
      return data as ScrapingSession
    }
  }
}

// Error handling utilities
export function handleSupabaseError(error: any): string {
  if (error.code === 'PGRST204') {
    return 'No data found'
  } else if (error.code === '23505') {
    return 'Duplicate entry'
  } else if (error.code === '42P01') {
    return 'Table does not exist'
  } else if (error.code === '42703') {
    return 'Column does not exist'
  } else if (error.message) {
    return error.message
  }
  return 'An unknown database error occurred'
}

// Pagination helpers
export interface PaginationOptions {
  page: number
  limit: number
  orderBy?: string
  ascending?: boolean
}

export function getPaginationRange(options: PaginationOptions) {
  const { page, limit } = options
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { from, to }
}

// Filter builder
export class FilterBuilder {
  private query: any
  
  constructor(tableName: string) {
    const supabase = createServerClient()
    this.query = supabase.from(tableName).select('*')
  }
  
  search(fields: string[], searchTerm: string) {
    if (searchTerm) {
      const conditions = fields.map(field => `${field}.ilike.%${searchTerm}%`).join(',')
      this.query = this.query.or(conditions)
    }
    return this
  }
  
  equals(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.query = this.query.eq(field, value)
    }
    return this
  }
  
  greaterThan(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.query = this.query.gt(field, value)
    }
    return this
  }
  
  lessThan(field: string, value: any) {
    if (value !== undefined && value !== null) {
      this.query = this.query.lt(field, value)
    }
    return this
  }
  
  between(field: string, min: any, max: any) {
    if (min !== undefined && min !== null) {
      this.query = this.query.gte(field, min)
    }
    if (max !== undefined && max !== null) {
      this.query = this.query.lte(field, max)
    }
    return this
  }
  
  orderBy(field: string, ascending = false) {
    this.query = this.query.order(field, { ascending })
    return this
  }
  
  paginate(page: number, limit: number) {
    const { from, to } = getPaginationRange({ page, limit })
    this.query = this.query.range(from, to)
    return this
  }
  
  async execute<T>() {
    const { data, error, count } = await this.query
    if (error) throw error
    return { data: data as T[], count }
  }
}

// Batch operations
export async function batchInsert<T>(
  tableName: string,
  records: T[],
  batchSize = 100
): Promise<void> {
  const supabase = createServerClient()
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from(tableName).insert(batch)
    if (error) throw error
  }
}

// Real-time subscriptions
export function subscribeToTable(
  tableName: string,
  callback: (payload: any) => void
) {
  const supabase = createBrowserClient()
  
  const subscription = supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe()
  
  return () => {
    subscription.unsubscribe()
  }
}

// Export default client creators
export default {
  createServerClient,
  createBrowserClient,
  db,
  handleSupabaseError,
  FilterBuilder,
  batchInsert,
  subscribeToTable,
}