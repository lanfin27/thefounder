// Chart page specific type definitions

export interface ChartPageProps {
  searchParams?: {
    industry?: string
    timeRange?: string
    sortBy?: 'transactions' | 'change' | 'value'
    view?: 'grid' | 'list'
  }
}

export interface ChartPageError {
  code: 'NETWORK_ERROR' | 'API_ERROR' | 'PARSE_ERROR' | 'UNKNOWN_ERROR'
  message: string
  timestamp: Date
  retryable: boolean
}

export interface ChartLoadingState {
  isLoading: boolean
  isRefreshing: boolean
  isError: boolean
  error?: ChartPageError
}

export interface ChartFilterState {
  timeRange: number
  sortBy: 'transactions' | 'change' | 'value'
  industries?: string[]
  viewMode: 'grid' | 'list'
}