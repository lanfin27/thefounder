// Flippa scanner using axios and node-html-parser (no undici/cheerio)
import axios from 'axios'
import { parse as parseHTML } from 'node-html-parser'
import { FlareSolverrClient } from '@/lib/cloudflare-bypass/flaresolverr-client'
import { createServerClient } from '@/lib/supabase'
import { sleep, generateId } from '@/lib/utils'

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
}

export class FlippaScannerAxios {
  private flaresolverr: FlareSolverrClient
  private supabase: ReturnType<typeof createServerClient>
  private sessionId: string = ''
  
  constructor() {
    this.flaresolverr = new FlareSolverrClient()
    this.supabase = createServerClient()
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
      scanId = generateId('scan')
    } = options
    
    const listings: ListingData[] = []
    const errors: any[] = []
    
    try {
      // Create scan session
      await this.createScanSession(scanId)
      
      // Create FlareSolverr session
      this.sessionId = await this.flaresolverr.createSession()
      console.log('🔄 FlareSolverr session created')
      
      // Scan pages
      for (let page = 1; page <= pages; page++) {
        console.log(`📄 Scanning page ${page}/${pages}...`)
        
        try {
          const pageListings = await this.scrapePage(page)
          listings.push(...pageListings)
          
          // Update progress
          await this.updateScanProgress(scanId, {
            pages_scanned: page,
            listings_found: listings.length,
            status: 'running'
          })
          
          // Human-like delay between pages
          if (page < pages) {
            const delay = delayMin + Math.random() * (delayMax - delayMin)
            console.log(`⏳ Waiting ${Math.round(delay)}s before next page...`)
            await sleep(delay * 1000)
          }
        } catch (error) {
          console.error(`❌ Error on page ${page}:`, error)
          errors.push({ page, error: error.message })
        }
      }
      
      // Complete scan session
      await this.completeScanSession(scanId, {
        listings_found: listings.length,
        pages_scanned: pages,
        errors
      })
      
      return {
        success: true,
        scanId,
        listings,
        errors
      }
      
    } catch (error) {
      console.error('❌ Scan failed:', error)
      errors.push({ general: error.message })
      
      await this.completeScanSession(scanId, {
        status: 'failed',
        errors
      })
      
      return {
        success: false,
        scanId,
        listings,
        errors
      }
    } finally {
      // Cleanup FlareSolverr session
      if (this.sessionId) {
        await this.flaresolverr.destroySession(this.sessionId)
      }
    }
  }

  private async scrapePage(page: number): Promise<ListingData[]> {
    const url = `https://flippa.com/search?page=${page}`
    
    // Use FlareSolverr to bypass Cloudflare
    const response = await this.flaresolverr.request({
      sessionId: this.sessionId,
      url,
      maxTimeout: 60000
    })
    
    if (!response.success) {
      throw new Error(`Failed to load page: ${response.error}`)
    }
    
    // Parse HTML using node-html-parser
    const root = parseHTML(response.data.solution.response)
    const listings: ListingData[] = []
    
    // Find listing cards
    const listingCards = root.querySelectorAll('[data-testid="listing-card"], .listing-card, article.listing')
    
    for (const card of listingCards) {
      try {
        // Extract listing ID from URL
        const linkElement = card.querySelector('a[href*="/businesses/"]')
        if (!linkElement) continue
        
        const href = linkElement.getAttribute('href') || ''
        const idMatch = href.match(/\/businesses\/([^/?]+)/)
        if (!idMatch) continue
        
        const listing_id = idMatch[1]
        
        // Extract title
        const titleElement = card.querySelector('h3, .listing-title, [data-testid="listing-title"]')
        const title = titleElement?.text?.trim() || 'Untitled'
        
        // Extract price
        const priceElement = card.querySelector('[data-testid="asking-price"], .asking-price, .price')
        const priceText = priceElement?.text || '0'
        const asking_price = this.parsePrice(priceText)
        
        // Extract revenue
        const revenueElement = card.querySelector('[data-testid="monthly-revenue"], .monthly-revenue, .revenue')
        const revenueText = revenueElement?.text || '0'
        const monthly_revenue = this.parsePrice(revenueText)
        
        // Extract category
        const categoryElement = card.querySelector('.property-type, .category, [data-testid="category"]')
        const category = categoryElement?.text?.trim() || 'Unknown'
        
        listings.push({
          listing_id,
          title,
          asking_price,
          monthly_revenue,
          category,
          url: `https://flippa.com${href}`
        })
      } catch (error) {
        console.error('Error parsing listing:', error)
      }
    }
    
    console.log(`✅ Found ${listings.length} listings on page ${page}`)
    return listings
  }

  private parsePrice(text: string): number {
    const cleaned = text.replace(/[^0-9.KMB]/g, '')
    let value = parseFloat(cleaned) || 0
    
    if (text.includes('K')) value *= 1000
    if (text.includes('M')) value *= 1000000
    if (text.includes('B')) value *= 1000000000
    
    return Math.round(value)
  }

  private async createScanSession(scanId: string): Promise<void> {
    await this.supabase
      .from('scan_sessions')
      .insert({
        scan_id: scanId,
        scan_type: 'incremental',
        status: 'running',
        started_at: new Date().toISOString()
      })
  }

  private async updateScanProgress(scanId: string, data: any): Promise<void> {
    await this.supabase
      .from('scan_sessions')
      .update(data)
      .eq('scan_id', scanId)
  }

  private async completeScanSession(scanId: string, data: any): Promise<void> {
    await this.supabase
      .from('scan_sessions')
      .update({
        ...data,
        status: data.status || 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('scan_id', scanId)
  }

  // Extract comparison data for baseline comparison
  async extractComparisonData(listings: ListingData[]): Promise<Map<string, any>> {
    const map = new Map()
    
    for (const listing of listings) {
      map.set(listing.listing_id, {
        listing_id: listing.listing_id,
        title: listing.title,
        asking_price: listing.asking_price,
        monthly_revenue: listing.monthly_revenue,
        category: listing.category,
        url: listing.url
      })
    }
    
    return map
  }
}