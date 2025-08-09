// New listing processor with complete detail extraction
import { FlareSolverrClient } from '@/lib/cloudflare-bypass/flaresolverr-client'
import { createServerClient } from '@/lib/supabase'
import { sleep, generateId } from '@/lib/utils'
import { parse as parseHTML } from 'node-html-parser'

interface ListingDetails {
  listing_id: string
  session_id?: string
  url: string
  title: string
  asking_price: number
  monthly_revenue: number
  monthly_profit: number
  age_months?: number
  page_views_monthly?: number
  category: string
  description?: string
  technologies?: string[]
  scraped_at?: string
}

export class ListingProcessor {
  private flaresolverr: FlareSolverrClient
  private supabase: ReturnType<typeof createServerClient>
  private sessionId: string = ''
  
  constructor() {
    this.flaresolverr = new FlareSolverrClient()
    this.supabase = createServerClient()
  }

  async processNewListings(listingIds: string[], scanId: string): Promise<{
    processed: number
    failed: number
    listings: ListingDetails[]
  }> {
    console.log(`🔄 Processing ${listingIds.length} new listings...`)
    
    const processed: ListingDetails[] = []
    const failed: string[] = []
    
    // Create FlareSolverr session
    this.sessionId = await this.flaresolverr.createSession()
    
    try {
      // Process in batches of 10
      const batchSize = 10
      for (let i = 0; i < listingIds.length; i += batchSize) {
        const batch = listingIds.slice(i, i + batchSize)
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(listingIds.length / batchSize)}`)
        
        const batchResults = await Promise.allSettled(
          batch.map(id => this.extractListingDetails(id))
        )
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            processed.push(result.value)
          } else {
            failed.push(batch[index])
            console.error(`❌ Failed to process listing ${batch[index]}`)
          }
        })
        
        // Insert batch into database
        if (processed.length > 0) {
          await this.insertListings(processed.slice(-batchSize))
        }
        
        // Human-like delay between batches
        if (i + batchSize < listingIds.length) {
          const delay = 30 + Math.random() * 30 // 30-60 seconds
          console.log(`⏳ Waiting ${Math.round(delay)}s before next batch...`)
          await sleep(delay * 1000)
        }
      }
    } finally {
      // Cleanup session
      await this.flaresolverr.destroySession(this.sessionId)
    }
    
    console.log(`✅ Processed ${processed.length} listings, ${failed.length} failed`)
    
    return {
      processed: processed.length,
      failed: failed.length,
      listings: processed
    }
  }

  private async extractListingDetails(listingId: string): Promise<ListingDetails | null> {
    try {
      const url = `https://flippa.com/businesses/${listingId}`
      
      // Use FlareSolverr to bypass Cloudflare
      const response = await this.flaresolverr.request({
        sessionId: this.sessionId,
        url,
        maxTimeout: 60000
      })
      
      if (!response.success) {
        throw new Error(`Failed to load listing: ${response.error}`)
      }
      
      // Parse HTML using node-html-parser
      const root = parseHTML(response.data.solution.response)
      
      // Extract detailed information
      const title = this.extractTextFromElement(root, 'h1.listing-title', 'Untitled')
      const priceText = this.extractTextFromElement(root, '[data-testid="asking-price"]', '0')
      const revenueText = this.extractTextFromElement(root, '[data-testid="monthly-revenue"]', '0')
      const profitText = this.extractTextFromElement(root, '[data-testid="monthly-profit"]', '0')
      const ageText = this.extractTextFromElement(root, '[data-testid="business-age"]', '')
      const trafficText = this.extractTextFromElement(root, '[data-testid="monthly-traffic"]', '0')
      const category = this.extractTextFromElement(root, '.property-type', 'Unknown')
      const description = this.extractTextFromElement(root, '.listing-description', '')
      
      // Extract technologies
      const technologies: string[] = []
      const techElements = root.querySelectorAll('.technology-tag')
      for (const el of techElements) {
        const tech = el.text?.trim()
        if (tech) technologies.push(tech)
      }
      
      // Parse numeric values
      const asking_price = this.parsePrice(priceText)
      const monthly_revenue = this.parsePrice(revenueText)
      const monthly_profit = this.parsePrice(profitText)
      const age_months = this.parseAge(ageText)
      const page_views_monthly = this.parseNumber(trafficText)
      
      return {
        listing_id: listingId,
        session_id: generateId('session'),
        url,
        title,
        asking_price,
        monthly_revenue,
        monthly_profit,
        age_months,
        page_views_monthly,
        category,
        description: description.slice(0, 1000), // Limit description length
        technologies: technologies.slice(0, 10), // Limit technologies
        scraped_at: new Date().toISOString()
      }
    } catch (error) {
      console.error(`Error extracting listing ${listingId}:`, error)
      return null
    }
  }

  private extractTextFromElement(root: any, selector: string, defaultValue: string = ''): string {
    const element = root.querySelector(selector)
    return element?.text?.trim() || defaultValue
  }

  private parsePrice(text: string): number {
    const cleaned = text.replace(/[^0-9.KMB]/g, '')
    let value = parseFloat(cleaned) || 0
    
    if (text.includes('K')) value *= 1000
    if (text.includes('M')) value *= 1000000
    if (text.includes('B')) value *= 1000000000
    
    return Math.round(value)
  }

  private parseAge(text: string): number | undefined {
    const match = text.match(/(\d+)\s*(year|month|day)/i)
    if (!match) return undefined
    
    const value = parseInt(match[1])
    const unit = match[2].toLowerCase()
    
    if (unit.includes('year')) return value * 12
    if (unit.includes('month')) return value
    if (unit.includes('day')) return Math.round(value / 30)
    
    return undefined
  }

  private parseNumber(text: string): number {
    return this.parsePrice(text)
  }

  private async insertListings(listings: ListingDetails[]): Promise<void> {
    if (listings.length === 0) return
    
    // Check for existing listings to prevent duplicates
    const listingIds = listings.map(l => l.listing_id)
    const { data: existing } = await this.supabase
      .from('flippa_listings')
      .select('listing_id, id')
      .or(listingIds.map(id => `listing_id.eq.${id}`).join(','))
    
    const existingIds = new Set(existing?.map(e => e.listing_id) || [])
    
    // Filter out duplicates
    const newListings = listings.filter(l => !existingIds.has(l.listing_id))
    
    if (newListings.length > 0) {
      const { error } = await this.supabase
        .from('flippa_listings')
        .insert(newListings)
      
      if (error) {
        console.error('Error inserting listings:', error)
        throw error
      }
      
      console.log(`✅ Inserted ${newListings.length} new listings`)
    } else {
      console.log('⚠️  All listings already exist in database')
    }
  }

  // Validate listing data
  validateListing(listing: ListingDetails): boolean {
    // Basic validation rules
    if (!listing.listing_id || !listing.title || !listing.url) {
      return false
    }
    
    if (listing.asking_price < 0 || listing.monthly_revenue < 0) {
      return false
    }
    
    if (listing.monthly_profit > listing.monthly_revenue) {
      // Profit can't exceed revenue
      listing.monthly_profit = listing.monthly_revenue
    }
    
    return true
  }

  // Get listing by ID from database
  async getListingById(listingId: string): Promise<any> {
    const { data } = await this.supabase
      .from('flippa_listings')
      .select('*')
      .or(`listing_id.eq.${listingId},id.eq.${listingId}`)
      .single()
    
    return data
  }
}