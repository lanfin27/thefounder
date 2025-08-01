// HTML parsing utilities for Flippa scraping

import * as cheerio from 'cheerio'
import type { FlippaRawListing, TrafficSource } from './types'
import { logger } from '../utils/logger'

export class FlippaParser {
  /**
   * Parse listing HTML to extract structured data
   */
  static parseListingHtml(html: string, url: string): FlippaRawListing | null {
    try {
      const $ = cheerio.load(html)
      
      // Extract listing ID from URL
      const listingId = this.extractListingId(url)
      if (!listingId) return null

      // Extract title
      const title = $('h1.listing-title, h1[data-testid="listing-title"]').first().text().trim()
      if (!title) return null

      // Extract price
      const priceText = $('[data-testid="asking-price"], .asking-price').first().text()
      const askingPrice = this.parsePrice(priceText)

      // Extract financial metrics
      const monthlyRevenue = this.extractMetric($, 'monthly-revenue', 'Monthly Revenue')
      const monthlyProfit = this.extractMetric($, 'monthly-profit', 'Monthly Profit')
      const annualRevenue = this.extractMetric($, 'annual-revenue', 'Annual Revenue') || monthlyRevenue * 12
      const annualProfit = this.extractMetric($, 'annual-profit', 'Annual Profit') || monthlyProfit * 12

      // Extract category and industry
      const category = $('[data-testid="category"], .listing-category').first().text().trim()
      const businessType = $('[data-testid="business-type"], .business-type').first().text().trim()
      const monetizationModel = $('[data-testid="monetization"], .monetization-model').first().text().trim()

      // Extract metrics
      const siteAgeText = $('[data-testid="site-age"], .site-age').first().text()
      const siteAgeMonths = this.parseAge(siteAgeText)
      
      const monthlyVisitors = this.extractMetric($, 'monthly-visitors', 'Monthly Visitors')
      const pageViews = this.extractMetric($, 'page-views', 'Page Views')

      // Extract engagement metrics
      const viewCount = this.extractCount($, 'view-count', 'Views')
      const watchCount = this.extractCount($, 'watch-count', 'Watchers')
      const bidCount = this.extractCount($, 'bid-count', 'Bids')

      // Check verification status
      const isVerified = $('.verified-badge, [data-testid="verified"]').length > 0

      // Extract seller rating
      const sellerRatingText = $('[data-testid="seller-rating"], .seller-rating').first().text()
      const sellerRating = this.parseRating(sellerRatingText)

      // Extract description
      const description = $('[data-testid="description"], .listing-description').first().text().trim()

      // Extract highlights
      const highlights: string[] = []
      $('[data-testid="highlights"] li, .listing-highlights li').each((_, el) => {
        const text = $(el).text().trim()
        if (text) highlights.push(text)
      })

      // Extract traffic sources
      const trafficSources = this.extractTrafficSources($)

      // Dates
      const listingDateText = $('[data-testid="listing-date"], .listing-date').first().text()
      const listingDate = this.parseDate(listingDateText) || new Date()

      return {
        listingId,
        title,
        url,
        askingPrice,
        monthlyRevenue,
        annualRevenue,
        monthlyProfit,
        annualProfit,
        category,
        industry: category,
        businessType,
        monetizationModel,
        siteAgeMonths,
        monthlyVisitors,
        pageViews,
        trafficSources,
        listingDate,
        lastUpdated: new Date(),
        viewCount,
        watchCount,
        bidCount,
        isVerified,
        sellerRating,
        description,
        highlights
      }
    } catch (error) {
      logger.error('Failed to parse listing HTML', { url, error })
      return null
    }
  }

  /**
   * Extract listing ID from URL
   */
  private static extractListingId(url: string): string {
    // Flippa URLs typically have format: /businesses/website/123456-business-name
    const match = url.match(/\/(\d+)(?:-|\/|$)/)
    return match ? match[1] : ''
  }

  /**
   * Parse price from text
   */
  private static parsePrice(text: string): number {
    if (!text) return 0
    
    // Remove currency symbols and commas
    const cleaned = text.replace(/[^\d.]/g, '')
    const price = parseFloat(cleaned)
    
    // Handle K, M suffixes
    if (text.toLowerCase().includes('k')) {
      return price * 1000
    } else if (text.toLowerCase().includes('m')) {
      return price * 1000000
    }
    
    return isNaN(price) ? 0 : Math.round(price)
  }

  /**
   * Extract numeric metric
   */
  private static extractMetric($: cheerio.CheerioAPI, testId: string, label: string): number {
    // Try data-testid first
    let text = $(`[data-testid="${testId}"]`).first().text()
    
    // Try by label
    if (!text) {
      $('*').each((_, el) => {
        const $el = $(el)
        if ($el.text().includes(label)) {
          const $next = $el.next()
          if ($next.length) {
            text = $next.text()
            return false // break
          }
        }
      })
    }
    
    return this.parsePrice(text)
  }

  /**
   * Extract count (views, bids, etc)
   */
  private static extractCount($: cheerio.CheerioAPI, testId: string, label: string): number {
    const text = $(`[data-testid="${testId}"], .${testId}`).first().text() || '0'
    const match = text.match(/\d+/)
    return match ? parseInt(match[0], 10) : 0
  }

  /**
   * Parse site age to months
   */
  private static parseAge(text: string): number {
    if (!text) return 0
    
    const yearMatch = text.match(/(\d+)\s*year/i)
    const monthMatch = text.match(/(\d+)\s*month/i)
    
    let months = 0
    if (yearMatch) months += parseInt(yearMatch[1], 10) * 12
    if (monthMatch) months += parseInt(monthMatch[1], 10)
    
    return months
  }

  /**
   * Parse seller rating
   */
  private static parseRating(text: string): number | undefined {
    if (!text) return undefined
    
    const match = text.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : undefined
  }

  /**
   * Parse date from text
   */
  private static parseDate(text: string): Date | null {
    if (!text) return null
    
    try {
      // Handle relative dates like "2 days ago"
      const daysAgoMatch = text.match(/(\d+)\s*days?\s*ago/i)
      if (daysAgoMatch) {
        const days = parseInt(daysAgoMatch[1], 10)
        const date = new Date()
        date.setDate(date.getDate() - days)
        return date
      }
      
      // Try parsing as standard date
      const date = new Date(text)
      return isNaN(date.getTime()) ? null : date
    } catch {
      return null
    }
  }

  /**
   * Extract traffic sources
   */
  private static extractTrafficSources($: cheerio.CheerioAPI): TrafficSource[] {
    const sources: TrafficSource[] = []
    
    // Look for traffic source chart/table
    $('[data-testid="traffic-sources"] [data-source], .traffic-source-item').each((_, el) => {
      const $el = $(el)
      const source = $el.attr('data-source') || $el.find('.source-name').text().trim()
      const percentageText = $el.attr('data-percentage') || $el.find('.source-percentage').text()
      const percentage = parseInt(percentageText.replace(/[^\d]/g, ''), 10)
      
      if (source && percentage) {
        sources.push({
          source: source.toLowerCase(),
          percentage
        })
      }
    })
    
    // Fallback: look for common patterns
    if (sources.length === 0) {
      const trafficText = $('.traffic-breakdown, [data-testid="traffic"]').text()
      const patterns = [
        { regex: /organic[:\s]+(\d+)%/i, source: 'organic' },
        { regex: /direct[:\s]+(\d+)%/i, source: 'direct' },
        { regex: /social[:\s]+(\d+)%/i, source: 'social' },
        { regex: /paid[:\s]+(\d+)%/i, source: 'paid' },
        { regex: /referral[:\s]+(\d+)%/i, source: 'referral' }
      ]
      
      for (const { regex, source } of patterns) {
        const match = trafficText.match(regex)
        if (match) {
          sources.push({
            source,
            percentage: parseInt(match[1], 10)
          })
        }
      }
    }
    
    return sources
  }

  /**
   * Parse search results page
   */
  static parseSearchResults(html: string): Array<{ url: string; listingId: string }> {
    const $ = cheerio.load(html)
    const results: Array<{ url: string; listingId: string }> = []
    
    // Find listing cards
    $('.listing-card, [data-testid="listing-card"]').each((_, el) => {
      const $el = $(el)
      const link = $el.find('a[href*="/businesses/"], a[href*="/domains/"]').first()
      const href = link.attr('href')
      
      if (href) {
        const url = href.startsWith('http') ? href : `https://flippa.com${href}`
        const listingId = this.extractListingId(url)
        
        if (listingId) {
          results.push({ url, listingId })
        }
      }
    })
    
    return results
  }

  /**
   * Check if there's a next page
   */
  static hasNextPage(html: string): boolean {
    const $ = cheerio.load(html)
    return $('.pagination-next:not(.disabled), [data-testid="next-page"]:not([disabled])').length > 0
  }
}