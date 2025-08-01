// Data validation for Flippa listings

import { SCRAPING_CONFIG } from '../config'
import type { FlippaListing, FlippaRawListing, ValidationResult } from './types'
import { logger } from '../utils/logger'

export class ListingValidator {
  private static requiredFields = SCRAPING_CONFIG.dataQuality.requiredFields
  private static priceRange = {
    min: SCRAPING_CONFIG.dataQuality.minAskingPrice,
    max: SCRAPING_CONFIG.dataQuality.maxAskingPrice
  }
  private static multipleRange = {
    profit: {
      min: SCRAPING_CONFIG.dataQuality.minProfitMultiple,
      max: SCRAPING_CONFIG.dataQuality.maxProfitMultiple
    },
    revenue: {
      min: SCRAPING_CONFIG.dataQuality.minRevenueMultiple,
      max: SCRAPING_CONFIG.dataQuality.maxRevenueMultiple
    }
  }

  /**
   * Validate a raw listing
   */
  static validate(listing: Partial<FlippaRawListing>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 100

    // Check required fields
    for (const field of this.requiredFields) {
      if (!listing[field as keyof FlippaRawListing]) {
        errors.push(`Missing required field: ${field}`)
        score -= 20
      }
    }

    // Validate price
    if (listing.askingPrice) {
      if (listing.askingPrice < this.priceRange.min) {
        errors.push(`Asking price too low: $${listing.askingPrice}`)
        score -= 15
      } else if (listing.askingPrice > this.priceRange.max) {
        errors.push(`Asking price too high: $${listing.askingPrice}`)
        score -= 15
      }
    }

    // Validate financial data consistency
    if (listing.monthlyRevenue && listing.annualRevenue) {
      const calculatedAnnual = listing.monthlyRevenue * 12
      const variance = Math.abs(calculatedAnnual - listing.annualRevenue) / listing.annualRevenue
      if (variance > 0.2) {
        warnings.push('Annual revenue doesn\'t match monthly revenue * 12')
        score -= 5
      }
    }

    if (listing.monthlyProfit && listing.annualProfit) {
      const calculatedAnnual = listing.monthlyProfit * 12
      const variance = Math.abs(calculatedAnnual - listing.annualProfit) / listing.annualProfit
      if (variance > 0.2) {
        warnings.push('Annual profit doesn\'t match monthly profit * 12')
        score -= 5
      }
    }

    // Validate profit margin
    if (listing.monthlyRevenue && listing.monthlyProfit) {
      const profitMargin = listing.monthlyProfit / listing.monthlyRevenue
      if (profitMargin > 1) {
        errors.push('Profit exceeds revenue')
        score -= 20
      } else if (profitMargin > 0.9) {
        warnings.push('Unusually high profit margin (>90%)')
        score -= 5
      }
    }

    // Check for suspicious patterns
    if (listing.viewCount === 0 && listing.bidCount && listing.bidCount > 0) {
      warnings.push('Bids without views is suspicious')
      score -= 10
    }

    if (listing.siteAgeMonths && listing.siteAgeMonths < 3 && listing.monthlyRevenue && listing.monthlyRevenue > 50000) {
      warnings.push('Very high revenue for new site')
      score -= 10
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      dataQualityScore: Math.max(0, score)
    }
  }

  /**
   * Calculate multiples from financial data
   */
  static calculateMultiples(listing: Partial<FlippaRawListing>): {
    revenueMultiple: number | null
    profitMultiple: number | null
  } {
    let revenueMultiple: number | null = null
    let profitMultiple: number | null = null

    if (listing.askingPrice && listing.annualRevenue && listing.annualRevenue > 0) {
      revenueMultiple = listing.askingPrice / listing.annualRevenue
      
      // Validate revenue multiple
      if (revenueMultiple < this.multipleRange.revenue.min || 
          revenueMultiple > this.multipleRange.revenue.max) {
        logger.warn('Revenue multiple out of range', {
          listingId: listing.listingId,
          revenueMultiple,
          askingPrice: listing.askingPrice,
          annualRevenue: listing.annualRevenue
        })
      }
    }

    if (listing.askingPrice && listing.annualProfit && listing.annualProfit > 0) {
      profitMultiple = listing.askingPrice / listing.annualProfit
      
      // Validate profit multiple
      if (profitMultiple < this.multipleRange.profit.min || 
          profitMultiple > this.multipleRange.profit.max) {
        logger.warn('Profit multiple out of range', {
          listingId: listing.listingId,
          profitMultiple,
          askingPrice: listing.askingPrice,
          annualProfit: listing.annualProfit
        })
      }
    }

    return { revenueMultiple, profitMultiple }
  }

  /**
   * Clean and normalize listing data
   */
  static normalize(listing: FlippaRawListing): FlippaListing {
    const validation = this.validate(listing)
    const multiples = this.calculateMultiples(listing)

    // Map traffic sources if available
    const trafficSources = listing.trafficSources || []

    return {
      id: '', // Will be set by database
      listingId: listing.listingId,
      title: this.cleanString(listing.title),
      url: listing.url,
      askingPrice: listing.askingPrice,
      monthlyRevenue: listing.monthlyRevenue || 0,
      annualRevenue: listing.annualRevenue || (listing.monthlyRevenue ? listing.monthlyRevenue * 12 : 0),
      monthlyProfit: listing.monthlyProfit || 0,
      annualProfit: listing.annualProfit || (listing.monthlyProfit ? listing.monthlyProfit * 12 : 0),
      revenueMultiple: multiples.revenueMultiple,
      profitMultiple: multiples.profitMultiple,
      primaryCategory: listing.category || 'Unknown',
      subCategory: listing.subCategory,
      industry: listing.industry || listing.category || 'Unknown',
      businessType: listing.businessType || 'Unknown',
      monetizationModel: listing.monetizationModel || 'Unknown',
      siteAgeMonths: listing.siteAgeMonths,
      monthlyVisitors: listing.monthlyVisitors,
      pageViews: listing.pageViews,
      trafficSources: trafficSources,
      listingDate: listing.listingDate || new Date(),
      lastUpdated: listing.lastUpdated || new Date(),
      viewCount: listing.viewCount || 0,
      watchCount: listing.watchCount || 0,
      bidCount: listing.bidCount || 0,
      isVerified: listing.isVerified || false,
      sellerRating: listing.sellerRating,
      description: listing.description,
      highlights: listing.highlights,
      keyMetrics: {},
      attachments: listing.attachments,
      scrapedAt: new Date(),
      dataQualityScore: validation.dataQualityScore,
      isActive: true,
      rawData: listing as any
    }
  }

  /**
   * Clean string data
   */
  private static cleanString(str: string): string {
    if (!str) return ''
    return str.trim().replace(/\s+/g, ' ')
  }

  /**
   * Batch validate listings
   */
  static validateBatch(listings: Partial<FlippaRawListing>[]): {
    valid: FlippaListing[]
    invalid: Array<{ listing: Partial<FlippaRawListing>, validation: ValidationResult }>
  } {
    const valid: FlippaListing[] = []
    const invalid: Array<{ listing: Partial<FlippaRawListing>, validation: ValidationResult }> = []

    for (const listing of listings) {
      const validation = this.validate(listing)
      
      if (validation.isValid && listing.listingId) {
        try {
          const normalized = this.normalize(listing as FlippaRawListing)
          valid.push(normalized)
        } catch (error) {
          logger.error('Error normalizing listing', {
            listingId: listing.listingId,
            error: error instanceof Error ? error.message : error
          })
          invalid.push({ listing, validation })
        }
      } else {
        invalid.push({ listing, validation })
      }
    }

    logger.info('Batch validation completed', {
      total: listings.length,
      valid: valid.length,
      invalid: invalid.length
    })

    return { valid, invalid }
  }

  /**
   * Check if listing should be updated
   */
  static shouldUpdate(existing: FlippaListing, newData: FlippaRawListing): boolean {
    // Always update if price changed
    if (existing.askingPrice !== newData.askingPrice) return true

    // Update if financial data changed
    if (existing.monthlyRevenue !== newData.monthlyRevenue) return true
    if (existing.monthlyProfit !== newData.monthlyProfit) return true

    // Update if engagement metrics changed significantly
    if (Math.abs((existing.viewCount || 0) - (newData.viewCount || 0)) > 10) return true
    if (existing.bidCount !== newData.bidCount) return true

    // Update if verification status changed
    if (existing.isVerified !== newData.isVerified) return true

    // Update if last updated is more than 24 hours ago
    const lastUpdate = new Date(existing.lastUpdated)
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceUpdate > 24) return true

    return false
  }
}