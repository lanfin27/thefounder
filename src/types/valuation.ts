// Valuation-specific type definitions and utilities
import { Currency, Country, ValuationMethod, ValuationInput, ValuationResult } from './index'

// Valuation calculation parameters
export interface DCFParameters {
  free_cash_flows: number[]
  discount_rate: number
  terminal_growth_rate: number
  terminal_year_fcf: number
}

export interface MultipleParameters {
  base_metric: number
  multiple: number
  metric_type: 'revenue' | 'profit' | 'ebitda'
}

export interface ComparableParameters {
  target_metrics: {
    revenue?: number
    profit?: number
    growth_rate?: number
  }
  peer_companies: {
    name: string
    revenue_multiple?: number
    profit_multiple?: number
    growth_rate?: number
  }[]
}

export interface VentureParameters {
  stage: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'later'
  total_addressable_market: number
  current_market_share: number
  projected_market_share: number
  burn_rate: number
  runway_months: number
  last_valuation?: number
}

// Validation schemas for input data
export const ValuationInputSchema = {
  dcf: {
    required: ['revenue', 'free_cash_flow', 'discount_rate', 'terminal_growth_rate'],
    optional: ['growth_rate', 'projection_years']
  },
  multiple: {
    required: ['selected_multiple', 'multiple_type'],
    optional: ['revenue', 'profit']
  },
  comparable: {
    required: ['comparable_companies'],
    optional: ['revenue', 'profit', 'growth_rate']
  },
  venture: {
    required: ['stage', 'total_addressable_market', 'burn_rate'],
    optional: ['market_share', 'runway_months']
  }
}

// Industry-specific valuation ranges (Korean market focused)
export const IndustryValuationRanges: Record<string, {
  revenue_multiple: { min: number; max: number; median: number }
  profit_multiple: { min: number; max: number; median: number }
}> = {
  'SaaS': {
    revenue_multiple: { min: 3, max: 15, median: 7 },
    profit_multiple: { min: 15, max: 50, median: 30 }
  },
  '이커머스': {
    revenue_multiple: { min: 0.5, max: 3, median: 1.5 },
    profit_multiple: { min: 10, max: 25, median: 15 }
  },
  '핀테크': {
    revenue_multiple: { min: 2, max: 10, median: 5 },
    profit_multiple: { min: 20, max: 40, median: 25 }
  },
  '헬스케어': {
    revenue_multiple: { min: 2, max: 8, median: 4 },
    profit_multiple: { min: 15, max: 35, median: 22 }
  },
  '교육': {
    revenue_multiple: { min: 1, max: 5, median: 2.5 },
    profit_multiple: { min: 12, max: 25, median: 18 }
  },
  '미디어/컨텐츠': {
    revenue_multiple: { min: 1, max: 6, median: 3 },
    profit_multiple: { min: 10, max: 30, median: 20 }
  }
}

// Currency conversion rates (would be fetched from API in production)
export const CurrencyRates: Record<Currency, number> = {
  'KRW': 1,
  'USD': 1300,
  'EUR': 1420,
  'JPY': 8.7,
  'CNY': 180
}

// Helper functions for valuation data
export const formatCurrency = (amount: number, currency: Currency): string => {
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return formatter.format(amount)
}

export const convertCurrency = (
  amount: number, 
  fromCurrency: Currency, 
  toCurrency: Currency
): number => {
  if (fromCurrency === toCurrency) return amount
  const krwAmount = amount * CurrencyRates[fromCurrency]
  return krwAmount / CurrencyRates[toCurrency]
}

export const getConfidenceLevel = (
  method: ValuationMethod,
  inputCompleteness: number
): 'low' | 'medium' | 'high' => {
  if (inputCompleteness < 0.5) return 'low'
  if (inputCompleteness < 0.8) return 'medium'
  return 'high'
}

export const calculateInputCompleteness = (
  method: ValuationMethod,
  input: ValuationInput
): number => {
  const schema = ValuationInputSchema[method]
  const requiredFields = schema.required
  const providedRequired = requiredFields.filter(
    field => input[field as keyof ValuationInput] !== undefined
  ).length
  
  return providedRequired / requiredFields.length
}

// Valuation method descriptions for UI
export const ValuationMethodInfo = {
  dcf: {
    name: '현금흐름할인법 (DCF)',
    description: '미래 현금흐름을 현재가치로 할인하여 기업가치를 산정',
    bestFor: '안정적인 현금흐름을 가진 성숙한 기업',
    requiredData: '매출, 현금흐름, 성장률, 할인율'
  },
  multiple: {
    name: '배수 평가법',
    description: '매출 또는 이익에 업계 평균 배수를 적용하여 평가',
    bestFor: '비교 가능한 기업이 많은 산업의 기업',
    requiredData: '매출 또는 이익, 업계 평균 배수'
  },
  comparable: {
    name: '비교 평가법',
    description: '유사한 기업들의 가치평가 지표를 비교하여 평가',
    bestFor: '상장된 유사 기업이 존재하는 경우',
    requiredData: '비교 대상 기업 리스트, 재무 지표'
  },
  venture: {
    name: '벤처 평가법',
    description: '시장 규모, 성장 가능성 등을 고려한 스타트업 평가',
    bestFor: '초기 단계 스타트업, 고성장 기업',
    requiredData: '시장 규모, 투자 단계, 번레이트'
  }
}

// Export types for API responses
export interface ValuationAPIResponse {
  success: boolean
  data?: Valuation
  error?: {
    code: string
    message: string
  }
}

export interface ValuationListResponse {
  valuations: Valuation[]
  total: number
  page: number
  limit: number
}