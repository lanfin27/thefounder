// Global TypeScript type definitions

// Database types
export interface FlippaListing {
  id: number
  session_id?: string | null
  url: string
  title: string
  asking_price: number
  monthly_revenue: number
  monthly_profit: number
  age_months?: number | null
  page_views_monthly?: number | null
  category: string
  description?: string | null
  technologies?: string[] | null
  scraped_at?: string | null
  created_at: string
}

export interface ScrapingSession {
  id: number
  session_id: string
  total_listings: number
  pages_processed: number
  success_rate: number
  processing_time: number
  started_at: string
  completed_at: string
  configuration?: any
  created_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  name?: string
  membership_status: 'free' | 'premium'
  membership_expires_at?: string
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string
  metadata?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Dashboard types
export interface DashboardStats {
  overview: {
    totalListings: number
    categoriesCount: number
    averageCompletionRate: number
    lastUpdate: string | null
  }
  categoryBreakdown: Record<string, number>
  priceDistribution: Record<string, number>
  revenueAnalysis: {
    totalListingsWithRevenue: number
    averageRevenue: number
    medianRevenue: number
    averageProfit: number
    profitMargin: number
  }
  ageDistribution: Record<string, number>
  trafficAnalysis: {
    totalListingsWithTraffic: number
    averagePageViews: number
    trafficDistribution: Record<string, number>
  }
  recentActivity: {
    last24h: number
    last7d: number
    lastUpdate: string | null
  }
  fieldCompletionRates: Record<string, number>
  topCategories: Array<{ category: string; count: number }>
}

export interface DashboardMetrics {
  successRate: number
  totalListings: number
  fieldCompletion: Record<string, number>
  processingTime: number
  lastRun: string
  meetsApifyStandard: boolean
  recentActivity: {
    last24h: number
    averagePerHour: number
  }
  summary: {
    dataQuality: string
    completeness: string
    totalRecords: number
    lastUpdate: string | null
  }
}

// Filter types
export interface ListingsFilter {
  search?: string
  category?: string
  priceMin?: number
  priceMax?: number
  revenueMin?: number
  revenueMax?: number
  ageMin?: number
  ageMax?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Chart types
export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'horizontalBar'
  data: {
    labels: string[]
    datasets: Array<{
      label?: string
      data: number[] | Array<{ x: number; y: number }>
      backgroundColor?: string | string[]
      borderColor?: string
      fill?: boolean
      tension?: number
    }>
  }
  options?: any
  summary?: any
}

// Search types
export interface SearchResult {
  id: number
  title: string
  url: string
  price: number
  revenue: number
  category: string
  description: string
  relevance: number
}

export interface SearchResponse {
  results: SearchResult[]
  suggestions: string[]
  total: number
  query: string
  type: string
}

// Export types
export interface ExportOptions {
  format: 'json' | 'csv' | 'excel'
  filters?: ListingsFilter
  fields?: string[]
  limit?: number
}

// Error types
export interface AppError extends Error {
  code?: string
  statusCode?: number
  details?: any
}

// Utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type ValueOf<T> = T[keyof T]

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error'
export type DataQuality = 'Excellent' | 'Good' | 'Fair' | 'Poor'

// Sort types
export type SortField = 
  | 'created_at' 
  | 'asking_price' 
  | 'monthly_revenue' 
  | 'monthly_profit' 
  | 'age_months' 
  | 'page_views_monthly' 
  | 'title'

export type SortOrder = 'asc' | 'desc'

// Category types
export type BusinessCategory = 
  | 'E-commerce'
  | 'SaaS'
  | 'Content'
  | 'Service'
  | 'Digital Product'
  | 'Newsletter'
  | 'Domain'
  | 'App'
  | 'Marketplace'
  | 'Other'

// Price range types
export interface PriceRange {
  label: string
  min: number
  max: number
}

// Component prop types
export interface DashboardProps {
  initialData?: {
    stats?: ApiResponse<DashboardStats>
    listings?: ApiResponse<PaginatedResponse<FlippaListing>>
    metrics?: ApiResponse<DashboardMetrics>
  }
}

export interface ListingsTableProps {
  listings: FlippaListing[]
  loading?: boolean
  onSort?: (field: SortField) => void
  sortField?: SortField
  sortOrder?: SortOrder
}

export interface FilterBarProps {
  filters: ListingsFilter
  onFilterChange: (filters: ListingsFilter) => void
  categories: string[]
}

export interface ChartProps {
  data: ChartData
  title?: string
  height?: number
  loading?: boolean
}

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
  }
  loading?: boolean
}

// Form types
export interface FormState<T = any> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}

// Action types
export type ActionType<T extends string, P = void> = P extends void
  ? { type: T }
  : { type: T; payload: P }