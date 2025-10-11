// Data service layer for valuation features
import { createClient } from '@/lib/supabase/server'
import { 
  IndustryMultiple, 
  FlippaListing, 
  Valuation,
  ValuationTemplate,
  CompanyProfile
} from '@/types'

export class ValuationDataService {
  static async getIndustryMultiples(industry: string, country = 'KR'): Promise<IndustryMultiple | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('industry_multiples')
      .select('*')
      .eq('industry', industry)
      .eq('country', country)
      .order('date_calculated', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Error fetching industry multiples:', error)
      
      // Return default multiples as fallback
      return {
        id: 0,
        industry,
        country: country as any,
        avg_profit_multiple: 3.0,
        median_profit_multiple: 2.5,
        min_profit_multiple: 1.5,
        max_profit_multiple: 5.0,
        avg_revenue_multiple: 1.5,
        median_revenue_multiple: 1.2,
        min_revenue_multiple: 0.8,
        max_revenue_multiple: 2.5,
        sample_size: 0,
        data_source: 'default',
        date_calculated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    return data
  }
  
  static async getAllIndustries(country = 'KR'): Promise<string[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('industry_multiples')
      .select('industry')
      .eq('country', country)
      .order('industry')
    
    if (error) {
      console.error('Error fetching industries:', error)
      // Return default industries as fallback
      return [
        'SaaS',
        'E-commerce',
        'Content Sites',
        'Mobile Apps',
        'Digital Services',
        'Marketplace',
        'Newsletter',
        'Online Education',
        'Dropshipping',
        'Affiliate Marketing'
      ]
    }
    
    return [...new Set(data.map(d => d.industry))]
  }
  
  static async getRecentListings(
    industry?: string, 
    limit = 10
  ): Promise<FlippaListing[]> {
    const supabase = await createClient()
    
    let query = supabase
      .from('flippa_listings')
      .select('*')
      .eq('listing_status', 'active')
      .order('listing_date', { ascending: false })
      .limit(limit)
    
    if (industry) {
      query = query.eq('industry', industry)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching listings:', error)
      return []
    }
    
    return data || []
  }
  
  static async getComparableListings(
    industry: string,
    monthlyRevenue?: number,
    limit = 10
  ): Promise<FlippaListing[]> {
    const supabase = await createClient()
    
    let query = supabase
      .from('flippa_listings')
      .select('*')
      .eq('industry', industry)
      .eq('listing_status', 'active')
    
    // Get similar revenue range (±50%)
    if (monthlyRevenue && monthlyRevenue > 0) {
      const minRevenue = monthlyRevenue * 0.5
      const maxRevenue = monthlyRevenue * 1.5
      query = query
        .gte('monthly_revenue', minRevenue)
        .lte('monthly_revenue', maxRevenue)
    }
    
    const { data, error } = await query
      .order('monthly_revenue', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching comparable listings:', error)
      return []
    }
    
    return data || []
  }
  
  static async saveValuation(
    valuation: Omit<Valuation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Valuation | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .insert(valuation)
      .select()
      .single()
    
    if (error) {
      console.error('Error saving valuation:', error)
      return null
    }
    
    return data
  }
  
  static async getUserValuations(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ valuations: Valuation[], total: number }> {
    const supabase = await createClient()
    
    const { data, error, count } = await supabase
      .from('valuations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('Error fetching user valuations:', error)
      return { valuations: [], total: 0 }
    }
    
    return { 
      valuations: data || [], 
      total: count || 0 
    }
  }
  
  static async getValuationById(
    id: string,
    userId: string
  ): Promise<Valuation | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching valuation:', error)
      return null
    }
    
    return data
  }
  
  static async updateValuation(
    id: string,
    userId: string,
    updates: Partial<Omit<Valuation, 'id' | 'created_at' | 'updated_at' | 'user_id'>>
  ): Promise<Valuation | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating valuation:', error)
      return null
    }
    
    return data
  }
  
  static async deleteValuation(
    id: string,
    userId: string
  ): Promise<boolean> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('valuations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error deleting valuation:', error)
      return false
    }
    
    return true
  }
  
  static async getPublicTemplates(
    industry?: string,
    limit = 20
  ): Promise<ValuationTemplate[]> {
    const supabase = await createClient()
    
    let query = supabase
      .from('valuation_templates')
      .select('*')
      .eq('is_public', true)
      .order('use_count', { ascending: false })
      .limit(limit)
    
    if (industry) {
      query = query.eq('industry', industry)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching templates:', error)
      return []
    }
    
    return data || []
  }
  
  static async getUserTemplates(userId: string): Promise<ValuationTemplate[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('valuation_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user templates:', error)
      return []
    }
    
    return data || []
  }
  
  static async saveTemplate(
    template: Omit<ValuationTemplate, 'id' | 'created_at' | 'updated_at' | 'use_count'>
  ): Promise<ValuationTemplate | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('valuation_templates')
      .insert({ ...template, use_count: 0 })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving template:', error)
      return null
    }
    
    return data
  }
  
  static async incrementTemplateUseCount(templateId: string): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase.rpc('increment_template_use_count', {
      template_id: templateId
    })
    
    if (error) {
      console.error('Error incrementing template use count:', error)
    }
  }
  
  static async getCompanyProfiles(userId: string): Promise<CompanyProfile[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('company_name')
    
    if (error) {
      console.error('Error fetching company profiles:', error)
      return []
    }
    
    return data || []
  }
  
  static async upsertCompanyProfile(
    profile: Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>
  ): Promise<CompanyProfile | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('company_profiles')
      .upsert(profile, {
        onConflict: 'user_id,company_name'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting company profile:', error)
      return null
    }
    
    return data
  }
  
  // Aggregate statistics for dashboard
  static async getValuationStats(userId: string): Promise<{
    totalValuations: number
    averageMultiple: number
    industryBreakdown: Record<string, number>
    recentActivity: Array<{ date: string; count: number }>
  }> {
    const supabase = await createClient()
    
    // Get all user valuations for stats
    const { data: valuations, error } = await supabase
      .from('valuations')
      .select('industry, results, created_at')
      .eq('user_id', userId)
    
    if (error || !valuations) {
      return {
        totalValuations: 0,
        averageMultiple: 0,
        industryBreakdown: {},
        recentActivity: []
      }
    }
    
    // Calculate statistics
    const totalValuations = valuations.length
    
    const multiples = valuations
      .map(v => v.results?.key_metrics?.profit_multiple || 0)
      .filter(m => m > 0)
    
    const averageMultiple = multiples.length > 0
      ? multiples.reduce((a, b) => a + b, 0) / multiples.length
      : 0
    
    // Industry breakdown
    const industryBreakdown = valuations.reduce((acc, v) => {
      acc[v.industry] = (acc[v.industry] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentValuations = valuations.filter(
      v => new Date(v.created_at) > thirtyDaysAgo
    )
    
    const activityByDate = recentValuations.reduce((acc, v) => {
      const date = new Date(v.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const recentActivity = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    return {
      totalValuations,
      averageMultiple: Number(averageMultiple.toFixed(1)),
      industryBreakdown,
      recentActivity
    }
  }
}