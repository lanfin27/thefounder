// Core valuation calculation engine
import { 
  ValuationInput, 
  ValuationResult, 
  IndustryMultiple,
  ValuationMethod
} from '@/types/valuation'

export interface ValuationEngineInput {
  companyName: string
  industry: string
  monthlyRevenue: number
  monthlyProfit: number
  businessAge?: number
  growthRate?: number
  // DCF specific
  freeCashFlow?: number
  discountRate?: number
  terminalGrowthRate?: number
  projectionYears?: number
  // Venture specific
  stage?: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'later'
  totalAddressableMarket?: number
  marketShare?: number
  burnRate?: number
  runwayMonths?: number
}

export interface ValuationEngineResult {
  estimatedValue: number
  multiple: number
  method: string
  confidenceInterval: [number, number]
  industryBenchmark: number
  percentileRank: number
  details?: {
    revenueBasedValue?: number
    profitBasedValue?: number
    dcfValue?: number
    ventureValue?: number
    adjustments?: {
      growthMultiplier?: number
      ageMultiplier?: number
      stageMultiplier?: number
    }
  }
}

export class ValuationEngine {
  static async calculateValuation(
    input: ValuationEngineInput,
    industryData: IndustryMultiple
  ): Promise<ValuationEngineResult> {
    // Calculate annual metrics
    const annualRevenue = input.monthlyRevenue * 12
    const annualProfit = input.monthlyProfit * 12
    
    // Revenue multiple calculation
    const revenueMultiple = industryData.avg_revenue_multiple || industryData.median_revenue_multiple || 1.5
    const revenueBasedValue = annualRevenue * revenueMultiple
    
    // Profit multiple calculation
    const profitMultiple = industryData.avg_profit_multiple || industryData.median_profit_multiple || 3.0
    const profitBasedValue = annualProfit > 0 ? annualProfit * profitMultiple : 0
    
    // Growth adjustment (10% growth = 5% value boost)
    const growthMultiplier = input.growthRate ? 
      1 + (input.growthRate / 100) * 0.5 : 1
    
    // Age adjustment (mature business = higher multiple, max 1.5x)
    const ageMultiplier = input.businessAge ? 
      Math.min(1 + (input.businessAge / 60), 1.5) : 1
    
    // DCF calculation if parameters provided
    let dcfValue = 0
    if (input.freeCashFlow && input.discountRate && input.terminalGrowthRate) {
      dcfValue = this.calculateDCF(input)
    }
    
    // Venture method calculation if parameters provided
    let ventureValue = 0
    if (input.stage && input.totalAddressableMarket) {
      ventureValue = this.calculateVentureValue(input)
    }
    
    // Use the highest valuation method
    const baseValue = Math.max(
      revenueBasedValue,
      profitBasedValue,
      dcfValue,
      ventureValue
    )
    
    // Apply adjustments
    const adjustedValue = baseValue * growthMultiplier * ageMultiplier
    
    // Calculate confidence interval (±20% base)
    const confidenceRange = 0.2
    const lowerBound = Math.round(adjustedValue * (1 - confidenceRange))
    const upperBound = Math.round(adjustedValue * (1 + confidenceRange))
    
    // Determine which method was primary
    let primaryMethod = 'revenue_multiple'
    if (profitBasedValue > revenueBasedValue && profitBasedValue > dcfValue && profitBasedValue > ventureValue) {
      primaryMethod = 'profit_multiple'
    } else if (dcfValue > revenueBasedValue && dcfValue > profitBasedValue && dcfValue > ventureValue) {
      primaryMethod = 'dcf'
    } else if (ventureValue > revenueBasedValue && ventureValue > profitBasedValue && ventureValue > dcfValue) {
      primaryMethod = 'venture'
    }
    
    // Calculate effective multiple
    const effectiveMultiple = annualProfit > 0 ? adjustedValue / annualProfit : 
                            annualRevenue > 0 ? adjustedValue / annualRevenue : 0
    
    return {
      estimatedValue: Math.round(adjustedValue),
      multiple: Number(effectiveMultiple.toFixed(1)),
      method: primaryMethod,
      confidenceInterval: [lowerBound, upperBound],
      industryBenchmark: profitMultiple,
      percentileRank: this.calculatePercentileRank(effectiveMultiple, industryData),
      details: {
        revenueBasedValue: Math.round(revenueBasedValue),
        profitBasedValue: Math.round(profitBasedValue),
        dcfValue: Math.round(dcfValue),
        ventureValue: Math.round(ventureValue),
        adjustments: {
          growthMultiplier: Number(growthMultiplier.toFixed(2)),
          ageMultiplier: Number(ageMultiplier.toFixed(2))
        }
      }
    }
  }
  
  private static calculateDCF(input: ValuationEngineInput): number {
    if (!input.freeCashFlow || !input.discountRate || !input.terminalGrowthRate) {
      return 0
    }
    
    const projectionYears = input.projectionYears || 5
    const discountRate = input.discountRate / 100
    const terminalGrowthRate = input.terminalGrowthRate / 100
    const growthRate = (input.growthRate || 10) / 100
    
    let presentValue = 0
    let currentCashFlow = input.freeCashFlow * 12 // Annualize
    
    // Calculate present value of projected cash flows
    for (let year = 1; year <= projectionYears; year++) {
      currentCashFlow *= (1 + growthRate)
      const discountFactor = Math.pow(1 + discountRate, year)
      presentValue += currentCashFlow / discountFactor
    }
    
    // Calculate terminal value
    const terminalCashFlow = currentCashFlow * (1 + terminalGrowthRate)
    const terminalValue = terminalCashFlow / (discountRate - terminalGrowthRate)
    const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, projectionYears)
    
    return presentValue + discountedTerminalValue
  }
  
  private static calculateVentureValue(input: ValuationEngineInput): number {
    if (!input.totalAddressableMarket || !input.stage) {
      return 0
    }
    
    // Stage multipliers (based on typical VC valuations)
    const stageMultipliers = {
      seed: 0.001,
      series_a: 0.005,
      series_b: 0.02,
      series_c: 0.05,
      later: 0.1
    }
    
    const stageMultiplier = stageMultipliers[input.stage] || 0.001
    const currentMarketShare = input.marketShare || 0.1 // Default 0.1%
    
    // Calculate potential market capture
    const potentialRevenue = input.totalAddressableMarket * (currentMarketShare / 100)
    
    // Apply stage-based valuation
    let baseValue = potentialRevenue * stageMultiplier
    
    // Adjust for burn rate and runway
    if (input.burnRate && input.runwayMonths) {
      const burnAdjustment = Math.max(0.5, Math.min(1.5, input.runwayMonths / 18))
      baseValue *= burnAdjustment
    }
    
    return baseValue
  }
  
  private static calculatePercentileRank(
    effectiveMultiple: number, 
    industryData: IndustryMultiple
  ): number {
    const avgMultiple = industryData.avg_profit_multiple || 3.0
    const minMultiple = industryData.min_profit_multiple || avgMultiple * 0.5
    const maxMultiple = industryData.max_profit_multiple || avgMultiple * 2
    
    if (effectiveMultiple <= minMultiple) return 10
    if (effectiveMultiple >= maxMultiple) return 90
    
    // Linear interpolation between min and max
    const range = maxMultiple - minMultiple
    const position = effectiveMultiple - minMultiple
    const percentile = (position / range) * 80 + 10
    
    return Math.round(Math.min(Math.max(percentile, 0), 100))
  }
  
  // Convert to format expected by database
  static toValuationResult(
    engineResult: ValuationEngineResult,
    method: ValuationMethod = 'multiple'
  ): ValuationResult {
    return {
      valuation: engineResult.estimatedValue,
      method: method,
      confidence_level: this.getConfidenceLevel(engineResult.percentileRank),
      multiple_details: {
        applied_multiple: engineResult.multiple,
        base_metric: engineResult.details?.profitBasedValue || engineResult.details?.revenueBasedValue || 0,
        base_metric_type: engineResult.method.includes('profit') ? 'profit' : 'revenue'
      },
      sensitivity_analysis: {
        base_case: engineResult.estimatedValue,
        optimistic: engineResult.confidenceInterval[1],
        pessimistic: engineResult.confidenceInterval[0]
      },
      key_metrics: {
        revenue_multiple: engineResult.details?.revenueBasedValue ? 
          engineResult.details.revenueBasedValue / (engineResult.details.revenueBasedValue / engineResult.industryBenchmark) : undefined,
        profit_multiple: engineResult.multiple,
        growth_adjusted_multiple: engineResult.details?.adjustments?.growthMultiplier ? 
          engineResult.multiple * engineResult.details.adjustments.growthMultiplier : undefined
      }
    }
  }
  
  private static getConfidenceLevel(percentileRank: number): 'low' | 'medium' | 'high' {
    if (percentileRank >= 70) return 'high'
    if (percentileRank >= 40) return 'medium'
    return 'low'
  }
}