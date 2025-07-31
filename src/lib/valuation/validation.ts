export interface ValidationError {
  field: string
  message: string
}

export interface ValuationInputValidation {
  companyName: string
  industry: string
  monthlyRevenue: number
  monthlyProfit: number
  businessAge?: number
  growthRate?: number
  freeCashFlow?: number
  discountRate?: number
  terminalGrowthRate?: number
  projectionYears?: number
  stage?: string
  totalAddressableMarket?: number
  marketShare?: number
  burnRate?: number
  runwayMonths?: number
}

export function validateValuationInput(input: ValuationInputValidation): ValidationError[] {
  const errors: ValidationError[] = []

  // Company name validation
  if (!input.companyName || input.companyName.trim().length < 2) {
    errors.push({
      field: 'companyName',
      message: '회사명은 최소 2글자 이상 입력해주세요'
    })
  }

  if (input.companyName && input.companyName.length > 100) {
    errors.push({
      field: 'companyName',
      message: '회사명은 100글자를 초과할 수 없습니다'
    })
  }

  // Industry validation
  if (!input.industry) {
    errors.push({
      field: 'industry',
      message: '업종을 선택해주세요'
    })
  }

  // Revenue validation
  if (input.monthlyRevenue < 0) {
    errors.push({
      field: 'monthlyRevenue',
      message: '월 매출은 0 이상의 값을 입력해주세요'
    })
  }

  if (input.monthlyRevenue > 10000000000) { // 100억원
    errors.push({
      field: 'monthlyRevenue',
      message: '월 매출이 너무 큽니다. 값을 확인해주세요 (최대 100억원)'
    })
  }

  // Profit validation
  if (input.monthlyProfit < 0) {
    errors.push({
      field: 'monthlyProfit',
      message: '월 순이익은 0 이상의 값을 입력해주세요'
    })
  }

  if (input.monthlyProfit > input.monthlyRevenue) {
    errors.push({
      field: 'monthlyProfit',
      message: '월 순이익은 월 매출보다 클 수 없습니다'
    })
  }

  // Business age validation
  if (input.businessAge !== undefined) {
    if (input.businessAge < 0) {
      errors.push({
        field: 'businessAge',
        message: '사업 연수는 0 이상의 값을 입력해주세요'
      })
    }

    if (input.businessAge > 600) { // 50년
      errors.push({
        field: 'businessAge',
        message: '사업 연수가 너무 큽니다. 개월 단위로 입력해주세요 (최대 600개월)'
      })
    }
  }

  // Growth rate validation
  if (input.growthRate !== undefined) {
    if (input.growthRate < -50) {
      errors.push({
        field: 'growthRate',
        message: '성장률은 -50% 이상의 값을 입력해주세요'
      })
    }

    if (input.growthRate > 200) {
      errors.push({
        field: 'growthRate',
        message: '성장률은 200% 이하의 값을 입력해주세요'
      })
    }
  }

  // DCF specific validations
  if (input.freeCashFlow !== undefined && input.freeCashFlow < 0) {
    errors.push({
      field: 'freeCashFlow',
      message: '잉여현금흐름은 0 이상의 값을 입력해주세요'
    })
  }

  if (input.discountRate !== undefined) {
    if (input.discountRate < 0 || input.discountRate > 100) {
      errors.push({
        field: 'discountRate',
        message: '할인율은 0%에서 100% 사이의 값을 입력해주세요'
      })
    }
  }

  if (input.terminalGrowthRate !== undefined) {
    if (input.terminalGrowthRate < 0 || input.terminalGrowthRate > 10) {
      errors.push({
        field: 'terminalGrowthRate',
        message: '영구성장률은 0%에서 10% 사이의 값을 입력해주세요'
      })
    }
  }

  if (input.projectionYears !== undefined) {
    if (input.projectionYears < 1 || input.projectionYears > 20) {
      errors.push({
        field: 'projectionYears',
        message: '예측 기간은 1년에서 20년 사이로 입력해주세요'
      })
    }
  }

  // Venture specific validations
  if (input.totalAddressableMarket !== undefined && input.totalAddressableMarket < 0) {
    errors.push({
      field: 'totalAddressableMarket',
      message: '시장 규모는 0 이상의 값을 입력해주세요'
    })
  }

  if (input.marketShare !== undefined) {
    if (input.marketShare < 0 || input.marketShare > 100) {
      errors.push({
        field: 'marketShare',
        message: '시장 점유율은 0%에서 100% 사이의 값을 입력해주세요'
      })
    }
  }

  if (input.burnRate !== undefined && input.burnRate < 0) {
    errors.push({
      field: 'burnRate',
      message: '번레이트는 0 이상의 값을 입력해주세요'
    })
  }

  if (input.runwayMonths !== undefined) {
    if (input.runwayMonths < 0 || input.runwayMonths > 120) {
      errors.push({
        field: 'runwayMonths',
        message: '런웨이는 0개월에서 120개월 사이로 입력해주세요'
      })
    }
  }

  return errors
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => `• ${error.message}`).join('\n')
}

export function getFieldError(errors: ValidationError[], fieldName: string): string | undefined {
  const error = errors.find(err => err.field === fieldName)
  return error?.message
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim() // Remove leading/trailing whitespace
    .slice(0, 200) // Limit length
}

// Format number input
export function formatNumberInput(value: string | number): number {
  if (typeof value === 'number') return value
  
  // Remove commas and convert to number
  const cleaned = value.replace(/,/g, '')
  const num = parseFloat(cleaned)
  
  return isNaN(num) ? 0 : num
}