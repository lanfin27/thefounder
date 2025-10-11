// Database helper functions for valuations
import { createClient } from '@/lib/supabase/client'
import type {
  Valuation,
  ValuationInput,
  ValuationResult,
  FlippaListing,
  IndustryMultiple,
  ValuationTemplate,
  CompanyProfile,
  ValuationMethod
} from '@/types'

// Valuation CRUD operations
export const valuationDb = {
  // Create a new valuation
  async create(valuation: Omit<Valuation, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .insert(valuation)
      .select()
      .single()
    
    if (error) throw error
    return data as Valuation
  },

  // Get all valuations for a user
  async getByUserId(userId: string, limit = 10, offset = 0) {
    const supabase = createClient()
    
    const { data, error, count } = await supabase
      .from('valuations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return { valuations: data as Valuation[], total: count || 0 }
  },

  // Get a single valuation by ID
  async getById(id: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Valuation
  },

  // Update a valuation
  async update(id: string, updates: Partial<Omit<Valuation, 'id' | 'created_at' | 'updated_at'>>) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Valuation
  },

  // Delete a valuation
  async delete(id: string) {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('valuations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get valuations by company name
  async getByCompanyName(userId: string, companyName: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('valuations')
      .select('*')
      .eq('user_id', userId)
      .eq('company_name', companyName)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Valuation[]
  }
}

// Industry multiples operations
export const industryMultiplesDb = {
  // Get latest multiples for an industry
  async getByIndustry(industry: string, country = 'KR') {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('industry_multiples')
      .select('*')
      .eq('industry', industry)
      .eq('country', country)
      .order('date_calculated', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
    return data as IndustryMultiple | null
  },

  // Get all available industries
  async getIndustries(country = 'KR') {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('industry_multiples')
      .select('industry')
      .eq('country', country)
      .order('industry')
    
    if (error) throw error
    const uniqueIndustries = [...new Set(data?.map(item => item.industry) || [])]
    return uniqueIndustries
  },

  // Get historical multiples for an industry
  async getHistorical(industry: string, country = 'KR', days = 365) {
    const supabase = createClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('industry_multiples')
      .select('*')
      .eq('industry', industry)
      .eq('country', country)
      .gte('date_calculated', startDate.toISOString())
      .order('date_calculated', { ascending: false })
    
    if (error) throw error
    return data as IndustryMultiple[]
  }
}

// Flippa listings operations
export const flippaListingsDb = {
  // Search listings by criteria
  async search(params: {
    industry?: string
    minPrice?: number
    maxPrice?: number
    minRevenue?: number
    maxRevenue?: number
    limit?: number
    offset?: number
  }) {
    const supabase = createClient()
    let query = supabase.from('flippa_listings').select('*', { count: 'exact' })
    
    if (params.industry) {
      query = query.eq('industry', params.industry)
    }
    if (params.minPrice !== undefined) {
      query = query.gte('asking_price', params.minPrice)
    }
    if (params.maxPrice !== undefined) {
      query = query.lte('asking_price', params.maxPrice)
    }
    if (params.minRevenue !== undefined) {
      query = query.gte('monthly_revenue', params.minRevenue)
    }
    if (params.maxRevenue !== undefined) {
      query = query.lte('monthly_revenue', params.maxRevenue)
    }
    
    query = query
      .eq('listing_status', 'active')
      .order('listing_date', { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 10) - 1)
    
    const { data, error, count } = await query
    
    if (error) throw error
    return { listings: data as FlippaListing[], total: count || 0 }
  },

  // Get comparable listings for valuation
  async getComparables(industry: string, revenue?: number, limit = 10) {
    const supabase = createClient()
    let query = supabase
      .from('flippa_listings')
      .select('*')
      .eq('industry', industry)
      .eq('listing_status', 'active')
    
    // If revenue provided, get similar revenue range (±50%)
    if (revenue) {
      const minRevenue = revenue * 0.5
      const maxRevenue = revenue * 1.5
      query = query
        .gte('monthly_revenue', minRevenue)
        .lte('monthly_revenue', maxRevenue)
    }
    
    const { data, error } = await query
      .order('monthly_revenue', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as FlippaListing[]
  }
}

// Valuation templates operations
export const valuationTemplatesDb = {
  // Get user's templates
  async getByUserId(userId: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('valuation_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as ValuationTemplate[]
  },

  // Get public templates
  async getPublic(industry?: string, method?: ValuationMethod) {
    const supabase = createClient()
    let query = supabase
      .from('valuation_templates')
      .select('*')
      .eq('is_public', true)
    
    if (industry) {
      query = query.eq('industry', industry)
    }
    if (method) {
      query = query.eq('valuation_method', method)
    }
    
    const { data, error } = await query
      .order('use_count', { ascending: false })
      .limit(20)
    
    if (error) throw error
    return data as ValuationTemplate[]
  },

  // Create a template
  async create(template: Omit<ValuationTemplate, 'id' | 'created_at' | 'updated_at' | 'use_count'>) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('valuation_templates')
      .insert({ ...template, use_count: 0 })
      .select()
      .single()
    
    if (error) throw error
    return data as ValuationTemplate
  },

  // Increment use count
  async incrementUseCount(id: string) {
    const supabase = createClient()
    
    const { error } = await supabase.rpc('increment_template_use_count', {
      template_id: id
    })
    
    if (error) throw error
  }
}

// Company profiles operations
export const companyProfilesDb = {
  // Get user's company profiles
  async getByUserId(userId: string) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('company_name')
    
    if (error) throw error
    return data as CompanyProfile[]
  },

  // Get or create company profile
  async upsert(profile: Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('company_profiles')
      .upsert(profile, {
        onConflict: 'user_id,company_name'
      })
      .select()
      .single()
    
    if (error) throw error
    return data as CompanyProfile
  },

  // Delete company profile
  async delete(id: string) {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('company_profiles')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Create RPC function for incrementing template use count (add to migration)
export const createIncrementTemplateUseCountFunction = `
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE valuation_templates
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`