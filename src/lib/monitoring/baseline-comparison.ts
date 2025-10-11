// Advanced baseline comparison engine
import { createServerClient } from '@/lib/supabase'
import type { FlippaListing } from '@/lib/types'

interface ComparisonResult {
  newListings: string[]
  deletedListings: string[]
  updatedListings: UpdatedListing[]
  priceDrops: PriceDrop[]
  revenueChanges: RevenueChange[]
  categoryChanges: CategoryChange[]
}

interface UpdatedListing {
  listing_id: string
  changes: Change[]
}

interface Change {
  field: string
  oldValue: any
  newValue: any
  changePercentage?: number
}

interface PriceDrop {
  listing_id: string
  oldPrice: number
  newPrice: number
  dropPercentage: number
  title: string
}

interface RevenueChange {
  listing_id: string
  oldRevenue: number
  newRevenue: number
  changeAmount: number
  title: string
}

interface CategoryChange {
  listing_id: string
  oldCategory: string
  newCategory: string
  title: string
}

export class BaselineComparison {
  private supabase: ReturnType<typeof createServerClient>
  private scanId: string
  
  constructor(scanId: string) {
    this.supabase = createServerClient()
    this.scanId = scanId
  }

  async compare(currentListings: Map<string, any>): Promise<ComparisonResult> {
    console.log('🔍 Starting baseline comparison...')
    
    // Get all existing listings from database
    const existingListings = await this.getExistingListings()
    const existingMap = new Map(existingListings.map(l => [l.listing_id || l.id.toString(), l]))
    
    // Get IDs
    const currentIds = new Set(currentListings.keys())
    const existingIds = new Set(existingMap.keys())
    
    // Find new listings
    const newListings = Array.from(currentIds).filter(id => !existingIds.has(id))
    
    // Find deleted listings
    const deletedListings = Array.from(existingIds).filter(id => !currentIds.has(id))
    
    // Find updated listings and analyze changes
    const updatedListings: UpdatedListing[] = []
    const priceDrops: PriceDrop[] = []
    const revenueChanges: RevenueChange[] = []
    const categoryChanges: CategoryChange[] = []
    
    for (const [id, currentListing] of currentListings) {
      if (existingMap.has(id)) {
        const existingListing = existingMap.get(id)!
        const changes = this.detectChanges(existingListing, currentListing)
        
        if (changes.length > 0) {
          updatedListings.push({ listing_id: id, changes })
          
          // Analyze specific change types
          await this.analyzeChanges(
            id,
            existingListing,
            currentListing,
            changes,
            priceDrops,
            revenueChanges,
            categoryChanges
          )
        }
      }
    }
    
    // Log all changes to database
    await this.logChanges({
      newListings,
      deletedListings,
      updatedListings,
      priceDrops,
      revenueChanges,
      categoryChanges
    })
    
    console.log(`✅ Comparison complete:`)
    console.log(`   - New: ${newListings.length}`)
    console.log(`   - Deleted: ${deletedListings.length}`)
    console.log(`   - Updated: ${updatedListings.length}`)
    console.log(`   - Price drops: ${priceDrops.length}`)
    
    return {
      newListings,
      deletedListings,
      updatedListings,
      priceDrops,
      revenueChanges,
      categoryChanges
    }
  }

  private async getExistingListings(): Promise<FlippaListing[]> {
    const { data, error } = await this.supabase
      .from('flippa_listings')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  }

  private detectChanges(existing: FlippaListing, current: any): Change[] {
    const changes: Change[] = []
    
    // Check title
    if (existing.title !== current.title) {
      changes.push({
        field: 'title',
        oldValue: existing.title,
        newValue: current.title
      })
    }
    
    // Check price
    if (existing.asking_price !== current.asking_price) {
      const changePercentage = ((current.asking_price - existing.asking_price) / existing.asking_price) * 100
      changes.push({
        field: 'asking_price',
        oldValue: existing.asking_price,
        newValue: current.asking_price,
        changePercentage
      })
    }
    
    // Check revenue
    if (existing.monthly_revenue !== current.monthly_revenue) {
      const changePercentage = existing.monthly_revenue > 0 
        ? ((current.monthly_revenue - existing.monthly_revenue) / existing.monthly_revenue) * 100
        : 100
      changes.push({
        field: 'monthly_revenue',
        oldValue: existing.monthly_revenue,
        newValue: current.monthly_revenue,
        changePercentage
      })
    }
    
    // Check category
    if (existing.category !== current.category) {
      changes.push({
        field: 'category',
        oldValue: existing.category,
        newValue: current.category
      })
    }
    
    return changes
  }

  private async analyzeChanges(
    listing_id: string,
    existing: FlippaListing,
    current: any,
    changes: Change[],
    priceDrops: PriceDrop[],
    revenueChanges: RevenueChange[],
    categoryChanges: CategoryChange[]
  ): Promise<void> {
    for (const change of changes) {
      // Check for significant price drops (>20%)
      if (change.field === 'asking_price' && change.changePercentage && change.changePercentage < -20) {
        priceDrops.push({
          listing_id,
          oldPrice: change.oldValue,
          newPrice: change.newValue,
          dropPercentage: Math.abs(change.changePercentage),
          title: existing.title
        })
      }
      
      // Check for significant revenue changes (>$5K)
      if (change.field === 'monthly_revenue') {
        const changeAmount = change.newValue - change.oldValue
        if (Math.abs(changeAmount) > 5000) {
          revenueChanges.push({
            listing_id,
            oldRevenue: change.oldValue,
            newRevenue: change.newValue,
            changeAmount,
            title: existing.title
          })
        }
      }
      
      // Track category changes
      if (change.field === 'category') {
        categoryChanges.push({
          listing_id,
          oldCategory: change.oldValue,
          newCategory: change.newValue,
          title: existing.title
        })
      }
    }
  }

  private async logChanges(result: ComparisonResult): Promise<void> {
    const changes: any[] = []
    
    // Log new listings
    for (const listing_id of result.newListings) {
      changes.push({
        listing_id,
        change_type: 'new',
        scan_id: this.scanId,
        listing_snapshot: result.newListings
      })
    }
    
    // Log deleted listings
    for (const listing_id of result.deletedListings) {
      changes.push({
        listing_id,
        change_type: 'deleted',
        scan_id: this.scanId
      })
    }
    
    // Log price drops
    for (const drop of result.priceDrops) {
      changes.push({
        listing_id: drop.listing_id,
        change_type: 'price_drop',
        field_name: 'asking_price',
        old_value: drop.oldPrice.toString(),
        new_value: drop.newPrice.toString(),
        change_percentage: drop.dropPercentage,
        scan_id: this.scanId,
        listing_snapshot: { title: drop.title }
      })
    }
    
    // Log revenue changes
    for (const change of result.revenueChanges) {
      changes.push({
        listing_id: change.listing_id,
        change_type: 'revenue_change',
        field_name: 'monthly_revenue',
        old_value: change.oldRevenue.toString(),
        new_value: change.newRevenue.toString(),
        change_percentage: ((change.changeAmount / change.oldRevenue) * 100),
        scan_id: this.scanId,
        listing_snapshot: { title: change.title }
      })
    }
    
    // Log category changes
    for (const change of result.categoryChanges) {
      changes.push({
        listing_id: change.listing_id,
        change_type: 'category_change',
        field_name: 'category',
        old_value: change.oldCategory,
        new_value: change.newCategory,
        scan_id: this.scanId,
        listing_snapshot: { title: change.title }
      })
    }
    
    // Batch insert changes
    if (changes.length > 0) {
      const { error } = await this.supabase
        .from('incremental_changes')
        .insert(changes)
      
      if (error) {
        console.error('Error logging changes:', error)
      }
    }
    
    // Update scan session statistics
    await this.supabase
      .from('scan_sessions')
      .update({
        new_listings: result.newListings.length,
        deleted_listings: result.deletedListings.length,
        updated_listings: result.updatedListings.length
      })
      .eq('scan_id', this.scanId)
  }

  // Get high-value discoveries for notifications
  async getHighValueDiscoveries(result: ComparisonResult): Promise<{
    highPriceListings: string[]
    highRevenueListings: string[]
    trendingCategories: string[]
  }> {
    const highPriceListings: string[] = []
    const highRevenueListings: string[] = []
    const categoryCount = new Map<string, number>()
    
    // Get config for thresholds
    const { data: config } = await this.supabase
      .from('monitoring_config')
      .select('config_value')
      .eq('config_key', 'notification_thresholds')
      .single()
    
    const thresholds = config?.config_value || {
      price: 100000,
      revenue: 10000
    }
    
    // Check new listings for high value
    for (const listing_id of result.newListings) {
      const listing = await this.getListingDetails(listing_id)
      if (listing) {
        if (listing.asking_price > thresholds.price) {
          highPriceListings.push(listing_id)
        }
        if (listing.monthly_revenue > thresholds.revenue) {
          highRevenueListings.push(listing_id)
        }
        
        // Count categories
        const count = categoryCount.get(listing.category) || 0
        categoryCount.set(listing.category, count + 1)
      }
    }
    
    // Find trending categories (3+ new listings)
    const trendingCategories = Array.from(categoryCount.entries())
      .filter(([_, count]) => count >= 3)
      .map(([category, _]) => category)
    
    return {
      highPriceListings,
      highRevenueListings,
      trendingCategories
    }
  }

  private async getListingDetails(listing_id: string): Promise<any> {
    const { data } = await this.supabase
      .from('flippa_listings')
      .select('*')
      .or(`listing_id.eq.${listing_id},id.eq.${listing_id}`)
      .single()
    
    return data
  }
}