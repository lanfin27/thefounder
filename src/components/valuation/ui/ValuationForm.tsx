'use client'

import { useState } from 'react'
import { Calculator, Building2, TrendingUp, DollarSign } from 'lucide-react'
import { INDUSTRY_OPTIONS, formatKoreanWon } from '@/lib/valuation/utils'
import { validateValuationInput, ValidationError, getFieldError } from '@/lib/valuation/validation'
import { useToast } from '@/components/ui/Toast'

interface ValuationFormData {
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
}

interface ValuationFormProps {
  onSubmit: (data: ValuationFormData) => void
  isLoading?: boolean
  initialData?: Partial<ValuationFormData>
}

export function ValuationForm({ onSubmit, isLoading = false, initialData }: ValuationFormProps) {
  const { addToast } = useToast()
  const [formData, setFormData] = useState<ValuationFormData>({
    companyName: initialData?.companyName || '',
    industry: initialData?.industry || '',
    monthlyRevenue: initialData?.monthlyRevenue || 0,
    monthlyProfit: initialData?.monthlyProfit || 0,
    businessAge: initialData?.businessAge || 0,
    growthRate: initialData?.growthRate || 0,
    freeCashFlow: initialData?.freeCashFlow,
    discountRate: initialData?.discountRate,
    terminalGrowthRate: initialData?.terminalGrowthRate,
    projectionYears: initialData?.projectionYears
  })

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateValuationInput(formData)
    setValidationErrors(errors)
    
    if (errors.length > 0) {
      addToast({
        type: 'error',
        title: '입력 오류',
        description: '폼의 오류를 수정해주세요'
      })
      return
    }
    
    onSubmit(formData)
  }

  const updateField = (field: keyof ValuationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors(prev => prev.filter(err => err.field !== field))
    }
  }

  // Calculate basic metrics for preview
  const annualRevenue = formData.monthlyRevenue * 12
  const annualProfit = formData.monthlyProfit * 12
  const profitMargin = formData.monthlyRevenue > 0 ? 
    (formData.monthlyProfit / formData.monthlyRevenue) * 100 : 0

  return (
    <div className="bg-white border border-medium-gray-border rounded-lg overflow-hidden">
      <div className="text-center px-6 py-8 border-b border-medium-gray-border">
        <div className="flex items-center justify-center mb-3">
          <Calculator className="w-8 h-8 text-medium-green mr-3" />
          <h1 className="text-heading-2 font-serif text-medium-black">
            비즈니스 밸류에이션
          </h1>
        </div>
        <p className="text-body text-medium-black-secondary leading-relaxed max-w-2xl mx-auto">
          회사 정보를 입력하여 전문적인 기업가치를 산정해보세요
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="px-6 py-8 space-y-8">
        {/* Error Messages */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-in">
            <p className="text-body-small font-medium text-red-800 mb-2">입력값을 확인해주세요:</p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-body-small text-red-700">{error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Company Info Section */}
        <div className="space-y-6">
          <div className="flex items-center mb-4">
            <Building2 className="w-5 h-5 text-medium-black-secondary mr-2" />
            <h2 className="text-heading-4 font-serif text-medium-black">기업 정보</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="companyName" className="block text-body-small font-medium text-medium-black mb-2">
                회사명 <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="예: 마이스타트업"
                required
                className={`w-full px-4 py-3 border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none transition-colors ${
                  getFieldError(validationErrors, 'companyName') 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-medium-gray-border focus:border-medium-green'
                }`}
              />
              {getFieldError(validationErrors, 'companyName') && (
                <p className="mt-1 text-caption text-red-600">
                  {getFieldError(validationErrors, 'companyName')}
                </p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="industry" className="block text-body-small font-medium text-medium-black mb-2">
                업종 <span className="text-red-500">*</span>
              </label>
              <select 
                id="industry"
                value={formData.industry} 
                onChange={(e) => updateField('industry', e.target.value)}
                required
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black focus:outline-none focus:border-medium-green transition-colors"
              >
                <option value="">업종을 선택하세요</option>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div className="space-y-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-medium-black-secondary mr-2" />
            <h2 className="text-heading-4 font-serif text-medium-black">재무 정보</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="monthlyRevenue" className="block text-body-small font-medium text-medium-black mb-2">
                월 매출 (원) <span className="text-red-500">*</span>
              </label>
              <input
                id="monthlyRevenue"
                type="number"
                value={formData.monthlyRevenue}
                onChange={(e) => updateField('monthlyRevenue', Number(e.target.value))}
                placeholder="10000000"
                required
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="monthlyProfit" className="block text-body-small font-medium text-medium-black mb-2">
                월 순이익 (원) <span className="text-red-500">*</span>
              </label>
              <input
                id="monthlyProfit"
                type="number"
                value={formData.monthlyProfit}
                onChange={(e) => updateField('monthlyProfit', Number(e.target.value))}
                placeholder="3000000"
                required
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="businessAge" className="block text-body-small font-medium text-medium-black mb-2">
                사업 연수 (개월)
              </label>
              <input
                id="businessAge"
                type="number"
                value={formData.businessAge}
                onChange={(e) => updateField('businessAge', Number(e.target.value))}
                placeholder="24"
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="growthRate" className="block text-body-small font-medium text-medium-black mb-2">
                월 성장률 (%)
              </label>
              <input
                id="growthRate"
                type="number"
                step="0.1"
                value={formData.growthRate}
                onChange={(e) => updateField('growthRate', Number(e.target.value))}
                placeholder="5.0"
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Advanced Options (Optional) */}
        <details className="group">
          <summary className="cursor-pointer text-body-small font-medium text-medium-black-secondary hover:text-medium-green transition-colors">
            고급 옵션 (DCF 분석)
          </summary>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-medium-gray-border">
            <div>
              <label htmlFor="freeCashFlow" className="block text-body-small font-medium text-medium-black mb-2">
                월 잉여현금흐름 (원)
              </label>
              <input
                id="freeCashFlow"
                type="number"
                value={formData.freeCashFlow || ''}
                onChange={(e) => updateField('freeCashFlow', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2000000"
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="discountRate" className="block text-body-small font-medium text-medium-black mb-2">
                할인율 (%)
              </label>
              <input
                id="discountRate"
                type="number"
                step="0.1"
                value={formData.discountRate || ''}
                onChange={(e) => updateField('discountRate', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="12.0"
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="terminalGrowthRate" className="block text-body-small font-medium text-medium-black mb-2">
                영구성장률 (%)
              </label>
              <input
                id="terminalGrowthRate"
                type="number"
                step="0.1"
                value={formData.terminalGrowthRate || ''}
                onChange={(e) => updateField('terminalGrowthRate', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2.0"
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="projectionYears" className="block text-body-small font-medium text-medium-black mb-2">
                예측 기간 (년)
              </label>
              <input
                id="projectionYears"
                type="number"
                value={formData.projectionYears || ''}
                onChange={(e) => updateField('projectionYears', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="5"
                className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black placeholder-medium-black-tertiary focus:outline-none focus:border-medium-green transition-colors"
              />
            </div>
          </div>
        </details>

        {/* Quick Preview */}
        {(formData.monthlyRevenue > 0 || formData.monthlyProfit > 0) && (
          <div className="bg-medium-gray-light rounded-lg p-6">
            <h3 className="text-body-small font-medium text-medium-black mb-4">재무 요약</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-caption text-medium-black-secondary mb-1">연 매출</p>
                <p className="text-body font-medium text-medium-black">{formatKoreanWon(annualRevenue)}</p>
              </div>
              <div>
                <p className="text-caption text-medium-black-secondary mb-1">연 순이익</p>
                <p className="text-body font-medium text-medium-black">{formatKoreanWon(annualProfit)}</p>
              </div>
              <div>
                <p className="text-caption text-medium-black-secondary mb-1">이익률</p>
                <p className="text-body font-medium text-medium-black">{profitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full bg-medium-green hover:bg-green-700 text-white font-medium py-4 px-6 rounded-lg transition-colors duration-200 text-body disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={isLoading || !formData.companyName || !formData.industry}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
              밸류에이션 계산 중...
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5 mr-2" />
              기업가치 산정하기
            </>
          )}
        </button>
      </form>
    </div>
  )
}