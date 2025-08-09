// Validation utilities

import type { ListingsFilter } from './types'

// Email validation
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

// URL validation
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' }
  }
  
  try {
    new URL(url)
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

// Price validation
export function validatePrice(price: any): { valid: boolean; error?: string } {
  const numPrice = Number(price)
  
  if (isNaN(numPrice)) {
    return { valid: false, error: 'Price must be a number' }
  }
  
  if (numPrice < 0) {
    return { valid: false, error: 'Price cannot be negative' }
  }
  
  if (numPrice > 1000000000) {
    return { valid: false, error: 'Price exceeds maximum allowed value' }
  }
  
  return { valid: true }
}

// Listing filter validation
export function validateListingFilters(filters: ListingsFilter): { 
  valid: boolean; 
  errors: Record<string, string> 
} {
  const errors: Record<string, string> = {}
  
  // Validate price range
  if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
    if (filters.priceMin > filters.priceMax) {
      errors.price = 'Minimum price cannot be greater than maximum price'
    }
  }
  
  // Validate revenue range
  if (filters.revenueMin !== undefined && filters.revenueMax !== undefined) {
    if (filters.revenueMin > filters.revenueMax) {
      errors.revenue = 'Minimum revenue cannot be greater than maximum revenue'
    }
  }
  
  // Validate age range
  if (filters.ageMin !== undefined && filters.ageMax !== undefined) {
    if (filters.ageMin > filters.ageMax) {
      errors.age = 'Minimum age cannot be greater than maximum age'
    }
  }
  
  // Validate pagination
  if (filters.page !== undefined && filters.page < 1) {
    errors.page = 'Page must be at least 1'
  }
  
  if (filters.limit !== undefined) {
    if (filters.limit < 1) {
      errors.limit = 'Limit must be at least 1'
    }
    if (filters.limit > 100) {
      errors.limit = 'Limit cannot exceed 100'
    }
  }
  
  // Validate search query
  if (filters.search !== undefined) {
    if (filters.search.length < 2) {
      errors.search = 'Search query must be at least 2 characters'
    }
    if (filters.search.length > 100) {
      errors.search = 'Search query is too long'
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

// Form validation builder
export class FormValidator<T extends Record<string, any>> {
  private rules: Map<keyof T, Array<(value: any) => string | null>> = new Map()
  
  field(name: keyof T) {
    const validators: Array<(value: any) => string | null> = []
    this.rules.set(name, validators)
    
    return {
      required: (message = `${String(name)} is required`) => {
        validators.push((value) => {
          if (value === null || value === undefined || value === '') {
            return message
          }
          return null
        })
        return this
      },
      
      min: (min: number, message = `${String(name)} must be at least ${min}`) => {
        validators.push((value) => {
          if (typeof value === 'number' && value < min) {
            return message
          }
          if (typeof value === 'string' && value.length < min) {
            return message
          }
          return null
        })
        return this
      },
      
      max: (max: number, message = `${String(name)} must be at most ${max}`) => {
        validators.push((value) => {
          if (typeof value === 'number' && value > max) {
            return message
          }
          if (typeof value === 'string' && value.length > max) {
            return message
          }
          return null
        })
        return this
      },
      
      email: (message = 'Invalid email format') => {
        validators.push((value) => {
          if (value && !validateEmail(value).valid) {
            return message
          }
          return null
        })
        return this
      },
      
      url: (message = 'Invalid URL format') => {
        validators.push((value) => {
          if (value && !validateUrl(value).valid) {
            return message
          }
          return null
        })
        return this
      },
      
      pattern: (regex: RegExp, message = 'Invalid format') => {
        validators.push((value) => {
          if (value && !regex.test(String(value))) {
            return message
          }
          return null
        })
        return this
      },
      
      custom: (validator: (value: any) => string | null) => {
        validators.push(validator)
        return this
      }
    }
  }
  
  validate(data: T): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
    const errors: Partial<Record<keyof T, string>> = {}
    
    for (const [field, validators] of this.rules.entries()) {
      const value = data[field]
      
      for (const validator of validators) {
        const error = validator(value)
        if (error) {
          errors[field] = error
          break // Stop at first error for this field
        }
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// Common validators
export const validators = {
  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== ''
  },
  
  minLength: (value: string, min: number): boolean => {
    return value.length >= min
  },
  
  maxLength: (value: string, max: number): boolean => {
    return value.length <= max
  },
  
  minValue: (value: number, min: number): boolean => {
    return value >= min
  },
  
  maxValue: (value: number, max: number): boolean => {
    return value <= max
  },
  
  between: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max
  },
  
  oneOf: <T>(value: T, options: T[]): boolean => {
    return options.includes(value)
  }
}

// Sanitization utilities
export const sanitize = {
  text: (value: string): string => {
    return value
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 1000) // Limit length
  },
  
  number: (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  },
  
  boolean: (value: any): boolean => {
    return Boolean(value)
  },
  
  url: (value: string): string => {
    try {
      const url = new URL(value)
      return url.toString()
    } catch {
      return ''
    }
  },
  
  email: (value: string): string => {
    return value.toLowerCase().trim()
  }
}