// Intelligent Flippa scanner with Cloudflare bypass
import { FlareSolverrClient } from '@/lib/cloudflare-bypass/flaresolverr-client'
import { createServerClient } from '@/lib/supabase'
import { sleep, generateId } from '@/lib/utils'
import * as cheerio from 'cheerio'

interface ScanOptions {
  pages?: number
  delayMin?: number
  delayMax?: number
  scanId?: string
}

interface ListingData {
  listing_id: string
  title: string
  asking_price: number
  monthly_revenue: number
  category: string
  url: string
  page_number: number
}

export class FlippaScanner {
  private flaresolverr: FlareSolverrClient
  private supabase: ReturnType<typeof createServerClient>
  private scanId: string
  
  constructor() {
    this.flaresolverr = new FlareSolverrClient()
    this.supabase = createServerClient()
    this.scanId = generateId('scan')
  }

  async scan(options: ScanOptions = {}): Promise<{
    success: boolean
    scanId: string
    listings: ListingData[]
    errors: any[]
  }> {
    const {
      pages = 5,
      delayMin = 60,
      delayMax = 120,
      scanId = this.scanId
    } = options

    this.scanId = scanId
    const listings: ListingData[] = []
    const errors: any[] = []

    // Start scan session
    await this.startScanSession()

    try {
      // Create session with FlareSolverr
      const sessionId = await this.flaresolverr.createSession()

      for (let page = 1; page <= pages; page++) {
        console.log(`📄 Scanning page ${page}/${pages}...`)
        
        try {
          const pageListings = await this.scanPage(page, sessionId)
          listings.push(...pageListings)
          
          // Update scan progress
          await this.updateScanProgress(page, listings.length)
          
          // Human-like delay between pages
          if (page < pages) {
            const delay = Math.random() * (delayMax - delayMin) + delayMin
            console.log(`⏳ Waiting ${Math.round(delay)}s before next page...`)
            await sleep(delay * 1000)
          }
        } catch (error) {
          console.error(`❌ Error scanning page ${page}:`, error)
          errors.push({ page, error: error.message })
          
          // Continue with next page after error
          await sleep(30000) // 30s cooldown after error
        }
      }

      // Destroy session
      await this.flaresolverr.destroySession(sessionId)

    } catch (error) {
      console.error('❌ Fatal scan error:', error)
      errors.push({ fatal: true, error: error.message })
    }

    // Complete scan session
    await this.completeScanSession(listings.length, errors)

    return {
      success: errors.length === 0,
      scanId: this.scanId,
      listings,
      errors
    }
  }

  private async scanPage(pageNumber: number, sessionId: string): Promise<ListingData[]> {
    const url = `https://flippa.com/search?filter[property_type]=website,app,fba,business&page=${pageNumber}`
    
    // Use FlareSolverr to bypass Cloudflare
    const response = await this.flaresolverr.request({
      sessionId,
      url,
      maxTimeout: 60000
    })

    if (!response.success) {
      throw new Error(`Failed to load page: ${response.error}`)
    }

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data.solution.response)
    const listings: ListingData[] = []

    // Extract listings from the page
    $('.ListingResults__listingCard').each((index, element) => {
      try {
        const $card = $(element)
        
        // Extract listing ID from URL
        const listingUrl = $card.find('a.ListingCard__anchor').attr('href') || ''
        const listingIdMatch = listingUrl.match(/\/(\d+)-/)
        const listing_id = listingIdMatch ? listingIdMatch[1] : ''
        
        if (!listing_id) return

        // Extract data
        const title = $card.find('.ListingCard__title').text().trim()
        const priceText = $card.find('.ListingCard__price').text().trim()
        const revenueText = $card.find('[data-testid="revenue-value"]').text().trim()
        const category = $card.find('.ListingCard__propertyType').text().trim()

        // Parse price and revenue
        const asking_price = this.parsePrice(priceText)
        const monthly_revenue = this.parsePrice(revenueText)

        listings.push({
          listing_id,
          title,
          asking_price,
          monthly_revenue,
          category,
          url: `https://flippa.com${listingUrl}`,
          page_number: pageNumber
        })
      } catch (error) {
        console.error('Error parsing listing:', error)
      }
    })

    console.log(`✅ Found ${listings.length} listings on page ${pageNumber}`)
    return listings
  }

  private parsePrice(priceText: string): number {
    // Remove currency symbols and convert to number
    const cleaned = priceText.replace(/[^0-9.]/g, '')
    const value = parseFloat(cleaned) || 0
    
    // Handle K/M suffixes
    if (priceText.includes('K')) return value * 1000
    if (priceText.includes('M')) return value * 1000000
    
    return value
  }

  private async startScanSession(): Promise<void> {
    await this.supabase
      .from('scan_sessions')
      .insert({
        scan_id: this.scanId,
        scan_type: 'automated',
        status: 'running',
        configuration: {
          scanner: 'FlippaScanner',
          version: '1.0'
        }
      })
  }

  private async updateScanProgress(pagesScanned: number, listingsFound: number): Promise<void> {
    await this.supabase
      .from('scan_sessions')
      .update({
        pages_scanned: pagesScanned,
        listings_found: listingsFound
      })
      .eq('scan_id', this.scanId)
  }

  private async completeScanSession(totalListings: number, errors: any[]): Promise<void> {
    const { data: session } = await this.supabase
      .from('scan_sessions')
      .select('started_at')
      .eq('scan_id', this.scanId)
      .single()

    const duration = session ? 
      Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000) : 0

    await this.supabase
      .from('scan_sessions')
      .update({
        status: errors.length > 0 ? 'partial' : 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        errors: errors
      })
      .eq('scan_id', this.scanId)
  }

  // Extract comparison data for existing listings
  async extractComparisonData(listings: ListingData[]): Promise<Map<string, ListingData>> {
    const comparisonMap = new Map<string, ListingData>()
    
    listings.forEach(listing => {
      comparisonMap.set(listing.listing_id, listing)
    })
    
    return comparisonMap
  }

  // Get current listing IDs from scan
  getListingIds(listings: ListingData[]): string[] {
    return listings.map(l => l.listing_id)
  }
}