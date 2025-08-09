// App-wide constants

// Application
export const APP_NAME = 'The Founder'
export const APP_DESCRIPTION = 'Korean startup insights and business listings platform'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// API
export const API_VERSION = 'v1'
export const API_TIMEOUT = 30000 // 30 seconds
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Cache
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const

// Dashboard
export const DASHBOARD_ROUTES = {
  ADMIN: '/admin',
  FLIPPA_LISTINGS: '/admin/flippa-listings',
  SCRAPING: '/admin/scraping',
  SCRAPING_STATUS: '/admin/scraping-status',
  SYNC: '/admin/sync',
  USER_DASHBOARD: '/dashboard',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  LIMITS: [10, 20, 50, 100],
} as const

// Sort options
export const SORT_OPTIONS = {
  CREATED_AT: 'created_at',
  PRICE: 'asking_price',
  REVENUE: 'monthly_revenue',
  PROFIT: 'monthly_profit',
  AGE: 'age_months',
  TRAFFIC: 'page_views_monthly',
  TITLE: 'title',
} as const

// Sort orders
export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const

// Price ranges
export const PRICE_RANGES = [
  { label: 'Any Price', min: 0, max: Infinity },
  { label: 'Under $10k', min: 0, max: 10000 },
  { label: '$10k - $50k', min: 10000, max: 50000 },
  { label: '$50k - $100k', min: 50000, max: 100000 },
  { label: '$100k - $500k', min: 100000, max: 500000 },
  { label: 'Over $500k', min: 500000, max: Infinity },
] as const

// Revenue ranges
export const REVENUE_RANGES = [
  { label: 'Any Revenue', min: 0, max: Infinity },
  { label: 'Under $1k/mo', min: 0, max: 1000 },
  { label: '$1k - $5k/mo', min: 1000, max: 5000 },
  { label: '$5k - $10k/mo', min: 5000, max: 10000 },
  { label: '$10k - $50k/mo', min: 10000, max: 50000 },
  { label: 'Over $50k/mo', min: 50000, max: Infinity },
] as const

// Age ranges (in months)
export const AGE_RANGES = [
  { label: 'Any Age', min: 0, max: Infinity },
  { label: '0-6 months', min: 0, max: 6 },
  { label: '6-12 months', min: 6, max: 12 },
  { label: '1-2 years', min: 12, max: 24 },
  { label: '2-5 years', min: 24, max: 60 },
  { label: 'Over 5 years', min: 60, max: Infinity },
] as const

// Chart colors
export const CHART_COLORS = {
  primary: '#3B82F6', // blue-500
  secondary: '#10B981', // green-500
  accent: '#8B5CF6', // purple-500
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  info: '#06B6D4', // cyan-500
  success: '#22C55E', // green-500
  gray: '#6B7280', // gray-500
} as const

// Chart color palette
export const CHART_PALETTE = [
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
] as const

// Status colors
export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
} as const

// Quality score thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  FAIR: 50,
  POOR: 30,
} as const

// Data quality grades
export const DATA_QUALITY_GRADES = {
  A: { min: 90, label: 'Excellent', color: 'text-green-600' },
  B: { min: 80, label: 'Good', color: 'text-blue-600' },
  C: { min: 70, label: 'Fair', color: 'text-yellow-600' },
  D: { min: 60, label: 'Poor', color: 'text-orange-600' },
  F: { min: 0, label: 'Failing', color: 'text-red-600' },
} as const

// Export formats
export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  EXCEL: 'excel',
} as const

// File size limits
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  EXPORT: 50 * 1024 * 1024, // 50MB
} as const

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  DELETED: 'Item deleted successfully.',
  UPDATED: 'Item updated successfully.',
  CREATED: 'Item created successfully.',
  EXPORTED: 'Data exported successfully.',
} as const

// Admin token (for development - should use env var in production)
export const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'supersecret'

// Supabase
export const SUPABASE_TABLES = {
  FLIPPA_LISTINGS: 'flippa_listings',
  SCRAPING_SESSIONS: 'scraping_sessions',
  SCRAPING_JOBS: 'scraping_jobs',
  PROFILES: 'profiles',
  POSTS: 'posts',
  BOOKMARKS: 'bookmarks',
  USER_READING_HISTORY: 'user_reading_history',
} as const

// Regular expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const