// Utility functions for valuation features
import { Currency } from '@/types'

export const formatCurrency = (amount: number, currency: Currency = 'USD'): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatKoreanWon = (amount: number): string => {
  if (amount >= 100000000) {
    // 억 단위
    const billions = amount / 100000000
    return `${billions.toFixed(1)}억원`
  } else if (amount >= 10000) {
    // 만원 단위
    const tenThousands = amount / 10000
    return `${Math.round(tenThousands).toLocaleString()}만원`
  }
  return `${Math.round(amount).toLocaleString()}원`
}

export const formatUSD = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${Math.round(amount).toLocaleString()}`
}

export const formatMultiple = (multiple: number): string => {
  return multiple.toFixed(1) + 'x'
}

export const formatPercentage = (value: number): string => {
  return value.toFixed(1) + '%'
}

export const getValueGrade = (percentileRank: number): string => {
  if (percentileRank >= 90) return 'A+'
  if (percentileRank >= 80) return 'A'
  if (percentileRank >= 70) return 'B+'
  if (percentileRank >= 60) return 'B'
  if (percentileRank >= 40) return 'C+'
  if (percentileRank >= 20) return 'C'
  return 'D'
}

export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A+': return 'text-green-600 bg-green-50'
    case 'A': return 'text-green-500 bg-green-50'
    case 'B+': return 'text-blue-500 bg-blue-50'
    case 'B': return 'text-blue-400 bg-blue-50'
    case 'C+': return 'text-yellow-500 bg-yellow-50'
    case 'C': return 'text-yellow-600 bg-yellow-50'
    default: return 'text-red-500 bg-red-50'
  }
}

export const getGradeDescription = (grade: string): string => {
  switch (grade) {
    case 'A+': return '매우 우수'
    case 'A': return '우수'
    case 'B+': return '양호'
    case 'B': return '평균 이상'
    case 'C+': return '평균'
    case 'C': return '평균 이하'
    default: return '개선 필요'
  }
}

export const INDUSTRY_OPTIONS = [
  'SaaS',
  'E-commerce',
  'Content Sites',
  'Mobile Apps',
  'Digital Services',
  'Marketplace',
  'Newsletter',
  'Online Education',
  'Dropshipping',
  'Affiliate Marketing',
  '이커머스',
  '핀테크',
  '헬스케어',
  '교육',
  '미디어/컨텐츠',
  '물류/유통',
  '제조',
  '부동산',
  'AI/머신러닝',
  '블록체인/크립토',
  '모빌리티',
  '푸드테크',
  '뷰티/패션',
  '여행/레저',
  'B2B 서비스'
] as const

export const BUSINESS_STAGES = [
  { value: 'seed', label: 'Seed', description: '아이디어 단계' },
  { value: 'series_a', label: 'Series A', description: '초기 매출 발생' },
  { value: 'series_b', label: 'Series B', description: '성장 가속화' },
  { value: 'series_c', label: 'Series C', description: '시장 확장' },
  { value: 'later', label: 'Later Stage', description: '성숙 단계' }
] as const

export const VALUATION_METHODS = [
  { 
    value: 'multiple', 
    label: '배수 평가법',
    description: '매출 또는 이익에 업계 평균 배수를 적용',
    bestFor: '안정적인 매출이 있는 비즈니스'
  },
  { 
    value: 'dcf', 
    label: '현금흐름할인법 (DCF)',
    description: '미래 현금흐름을 현재가치로 할인',
    bestFor: '예측 가능한 현금흐름이 있는 비즈니스'
  },
  { 
    value: 'comparable', 
    label: '비교 평가법',
    description: '유사한 기업들의 거래 사례를 비교',
    bestFor: '비교 가능한 거래 사례가 많은 산업'
  },
  { 
    value: 'venture', 
    label: '벤처 평가법',
    description: '시장 규모와 성장 가능성 기반',
    bestFor: '초기 단계 스타트업'
  }
] as const

export const validateValuationInput = (input: any): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (!input.companyName || input.companyName.trim().length === 0) {
    errors.push('회사명을 입력해주세요')
  }
  
  if (!input.industry) {
    errors.push('산업 분야를 선택해주세요')
  }
  
  if (input.monthlyRevenue < 0) {
    errors.push('월 매출은 0 이상이어야 합니다')
  }
  
  if (input.monthlyProfit < 0) {
    errors.push('월 수익은 0 이상이어야 합니다')
  }
  
  if (input.monthlyProfit > input.monthlyRevenue) {
    errors.push('월 수익은 월 매출보다 클 수 없습니다')
  }
  
  if (input.businessAge && input.businessAge < 0) {
    errors.push('사업 연수는 0 이상이어야 합니다')
  }
  
  if (input.growthRate && (input.growthRate < -100 || input.growthRate > 1000)) {
    errors.push('성장률은 -100%에서 1000% 사이여야 합니다')
  }
  
  // DCF specific validation
  if (input.discountRate && (input.discountRate < 0 || input.discountRate > 100)) {
    errors.push('할인율은 0%에서 100% 사이여야 합니다')
  }
  
  if (input.terminalGrowthRate && (input.terminalGrowthRate < 0 || input.terminalGrowthRate > 10)) {
    errors.push('영구성장률은 0%에서 10% 사이여야 합니다')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const getDefaultInputByIndustry = (industry: string): Partial<any> => {
  const defaults: Record<string, any> = {
    'SaaS': {
      growthRate: 20,
      discountRate: 15,
      terminalGrowthRate: 3,
      projectionYears: 5
    },
    'E-commerce': {
      growthRate: 15,
      discountRate: 12,
      terminalGrowthRate: 2,
      projectionYears: 5
    },
    'Content Sites': {
      growthRate: 10,
      discountRate: 10,
      terminalGrowthRate: 2,
      projectionYears: 3
    },
    'Mobile Apps': {
      growthRate: 25,
      discountRate: 20,
      terminalGrowthRate: 3,
      projectionYears: 5
    }
  }
  
  return defaults[industry] || {
    growthRate: 10,
    discountRate: 12,
    terminalGrowthRate: 2,
    projectionYears: 5
  }
}

export const getIndustryInsights = (industry: string): {
  trends: string[]
  risks: string[]
  opportunities: string[]
} => {
  const insights: Record<string, any> = {
    'SaaS': {
      trends: [
        'AI 기능 통합 증가',
        '구독 기반 모델 선호',
        '버티컬 SaaS 성장'
      ],
      risks: [
        '경쟁 심화',
        '고객 이탈률 관리',
        '가격 압박'
      ],
      opportunities: [
        '글로벌 확장 가능성',
        'API 생태계 구축',
        '엔터프라이즈 시장 진출'
      ]
    },
    'E-commerce': {
      trends: [
        '모바일 커머스 성장',
        '소셜 커머스 확대',
        'D2C 브랜드 증가'
      ],
      risks: [
        '물류비 상승',
        '플랫폼 의존도',
        '재고 관리 복잡성'
      ],
      opportunities: [
        '크로스보더 판매',
        '구독 박스 모델',
        'AI 개인화'
      ]
    }
  }
  
  return insights[industry] || {
    trends: ['시장 성장세', '디지털 전환 가속화', '고객 경험 중시'],
    risks: ['경쟁 심화', '규제 변화', '기술 변화 속도'],
    opportunities: ['신규 시장 진출', '제품 다각화', '파트너십 확대']
  }
}

export const calculateROI = (
  purchasePrice: number,
  monthlyProfit: number,
  holdingPeriod: number = 12
): number => {
  const totalProfit = monthlyProfit * holdingPeriod
  const roi = ((totalProfit - purchasePrice) / purchasePrice) * 100
  return Math.round(roi * 10) / 10
}

export const calculatePaybackPeriod = (
  purchasePrice: number,
  monthlyProfit: number
): number => {
  if (monthlyProfit <= 0) return Infinity
  return Math.round((purchasePrice / monthlyProfit) * 10) / 10
}