'use client'

import { IndustryMultiple } from '@/types'
import { MetricCard } from './MetricCard'
import { formatCurrency, formatKoreanWon, getValueGrade, getGradeColor, getGradeDescription } from '@/lib/valuation/utils'
import { TrendingUp, Award, BarChart3, Download, Bookmark, ChevronRight } from 'lucide-react'

interface ValuationResultsData {
  estimatedValue: number
  currency: string
  multiple: number
  method: string
  confidenceInterval: [number, number]
  confidenceLevel: 'low' | 'medium' | 'high'
  percentileRank: number
  details?: {
    revenueBasedValue?: number
    profitBasedValue?: number
    dcfValue?: number
    ventureValue?: number
    adjustments?: {
      growthMultiplier?: number
      ageMultiplier?: number
    }
  }
}

interface ValuationResultsProps {
  valuation: ValuationResultsData
  industryBenchmark?: IndustryMultiple
  companyName: string
  onSave?: () => void
  onExport?: () => void
  isLoading?: boolean
}

export function ValuationResults({ 
  valuation, 
  industryBenchmark, 
  companyName,
  onSave,
  onExport,
  isLoading = false
}: ValuationResultsProps) {
  const grade = getValueGrade(valuation.percentileRank)
  const gradeColor = getGradeColor(grade)
  const gradeDescription = getGradeDescription(grade)
  
  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'profit_multiple': return '순이익 멀티플'
      case 'revenue_multiple': return '매출 멀티플'
      case 'dcf': return 'DCF 모델'
      case 'venture': return '벤처 밸류에이션'
      default: return method
    }
  }

  const getConfidenceLabel = (level: string) => {
    switch (level) {
      case 'high': return '높음'
      case 'medium': return '보통'
      case 'low': return '낮음'
      default: return level
    }
  }

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-medium-green-light border border-medium-green-border rounded-lg overflow-hidden">
        <div className="px-6 py-8 text-center">
          <div className="flex items-center justify-center mb-3">
            <Award className="w-8 h-8 text-medium-green mr-3" />
            <h2 className="text-heading-2 font-serif text-medium-black">
              {companyName} 기업가치 산정 결과
            </h2>
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-caption font-medium bg-white border border-medium-gray-border text-medium-black">
              {getMethodLabel(valuation.method)}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-caption font-medium ${gradeColor}`}>
              등급: {grade} ({gradeDescription})
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-caption font-medium ${getConfidenceColor(valuation.confidenceLevel)}`}>
              신뢰도: {getConfidenceLabel(valuation.confidenceLevel)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="기업가치"
          value={valuation.estimatedValue}
          type="currency"
          currency={valuation.currency as 'USD' | 'KRW'}
          subtitle={`${valuation.multiple.toFixed(1)}x 멀티플 적용`}
          size="lg"
          className="md:col-span-2 lg:col-span-2"
        />
        
        <MetricCard
          title="가치 등급"
          value={valuation.percentileRank}
          type="grade"
          subtitle={`상위 ${(100 - valuation.percentileRank).toFixed(0)}%`}
        />
        
        <MetricCard
          title="업종 평균"
          value={industryBenchmark?.avg_profit_multiple || 3.0}
          type="multiple"
          subtitle="멀티플 비교"
        />
      </div>

      {/* Value Range */}
      <div className="bg-white border border-medium-gray-border rounded-lg p-6">
        <h3 className="text-heading-4 font-serif text-medium-black mb-6 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-medium-black-secondary" />
          가치 범위 분석
        </h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-medium-gray-light rounded-lg">
              <p className="text-body-small text-medium-black-secondary mb-2">최소 예상가치</p>
              <p className="text-heading-4 font-serif text-medium-black">
                {valuation.currency === 'KRW' 
                  ? formatKoreanWon(valuation.confidenceInterval[0])
                  : formatCurrency(valuation.confidenceInterval[0], valuation.currency as 'USD')}
              </p>
            </div>
            <div className="text-center p-4 bg-medium-gray-light rounded-lg">
              <p className="text-body-small text-medium-black-secondary mb-2">최대 예상가치</p>
              <p className="text-heading-4 font-serif text-medium-black">
                {valuation.currency === 'KRW' 
                  ? formatKoreanWon(valuation.confidenceInterval[1])
                  : formatCurrency(valuation.confidenceInterval[1], valuation.currency as 'USD')}
              </p>
            </div>
          </div>
          
          {/* Visual Range Bar */}
          <div className="relative">
            <div className="w-full h-3 bg-medium-gray rounded-full overflow-hidden">
              <div 
                className="h-3 bg-gradient-to-r from-medium-green-light to-medium-green rounded-full transition-all duration-500"
                style={{ width: `${valuation.percentileRank}%` }}
              />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-5 h-5 bg-medium-green rounded-full border-2 border-white shadow-md" />
            <div className="flex justify-between mt-2">
              <span className="text-caption text-medium-black-tertiary">0%</span>
              <span className="text-caption font-medium text-medium-green">
                현재 위치
              </span>
              <span className="text-caption text-medium-black-tertiary">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      {valuation.details && (
        <div className="bg-white border border-medium-gray-border rounded-lg p-6">
          <h3 className="text-heading-4 font-serif text-medium-black mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-medium-black-secondary" />
            상세 분석
          </h3>
          
          <div className="space-y-4">
            {valuation.details.revenueBasedValue && valuation.details.revenueBasedValue > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-medium-gray-border">
                <span className="text-body text-medium-black-secondary">매출 기반 가치</span>
                <span className="text-body font-medium text-medium-black">
                  {valuation.currency === 'KRW' 
                    ? formatKoreanWon(valuation.details.revenueBasedValue)
                    : formatCurrency(valuation.details.revenueBasedValue, valuation.currency as 'USD')}
                </span>
              </div>
            )}
            
            {valuation.details.profitBasedValue && valuation.details.profitBasedValue > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-medium-gray-border">
                <span className="text-body text-medium-black-secondary">순이익 기반 가치</span>
                <span className="text-body font-medium text-medium-black">
                  {valuation.currency === 'KRW' 
                    ? formatKoreanWon(valuation.details.profitBasedValue)
                    : formatCurrency(valuation.details.profitBasedValue, valuation.currency as 'USD')}
                </span>
              </div>
            )}
            
            {valuation.details.dcfValue && valuation.details.dcfValue > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-medium-gray-border">
                <span className="text-body text-medium-black-secondary">DCF 기반 가치</span>
                <span className="text-body font-medium text-medium-black">
                  {valuation.currency === 'KRW' 
                    ? formatKoreanWon(valuation.details.dcfValue)
                    : formatCurrency(valuation.details.dcfValue, valuation.currency as 'USD')}
                </span>
              </div>
            )}
            
            {valuation.details.adjustments && (
              <>
                <div className="flex justify-between items-center py-3 border-b border-medium-gray-border">
                  <span className="text-body text-medium-black-secondary">성장률 조정</span>
                  <span className="text-body font-medium text-medium-green">
                    +{((valuation.details.adjustments.growthMultiplier - 1) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-body text-medium-black-secondary">사업 연수 조정</span>
                  <span className="text-body font-medium text-medium-green">
                    +{((valuation.details.adjustments.ageMultiplier - 1) * 100).toFixed(0)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Industry Comparison */}
      {industryBenchmark && (
        <div className="bg-white border border-medium-gray-border rounded-lg p-6">
          <h3 className="text-heading-4 font-serif text-medium-black mb-6 flex items-center">
            <ChevronRight className="w-5 h-5 mr-2 text-medium-black-secondary" />
            업종 벤치마크 비교
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-medium-gray-light rounded-lg">
              <p className="text-caption text-medium-black-secondary mb-2">평균 P/E</p>
              <p className="text-heading-5 font-medium text-medium-black">
                {industryBenchmark.avg_profit_multiple?.toFixed(1) || 'N/A'}x
              </p>
            </div>
            <div className="text-center p-4 bg-medium-gray-light rounded-lg">
              <p className="text-caption text-medium-black-secondary mb-2">중간값 P/E</p>
              <p className="text-heading-5 font-medium text-medium-black">
                {industryBenchmark.median_profit_multiple?.toFixed(1) || 'N/A'}x
              </p>
            </div>
            <div className="text-center p-4 bg-medium-gray-light rounded-lg">
              <p className="text-caption text-medium-black-secondary mb-2">평균 P/S</p>
              <p className="text-heading-5 font-medium text-medium-black">
                {industryBenchmark.avg_revenue_multiple?.toFixed(1) || 'N/A'}x
              </p>
            </div>
            <div className="text-center p-4 bg-medium-gray-light rounded-lg">
              <p className="text-caption text-medium-black-secondary mb-2">표본 수</p>
              <p className="text-heading-5 font-medium text-medium-black">
                {industryBenchmark.sample_size || 0}개사
              </p>
            </div>
          </div>
          
          {industryBenchmark.data_source && (
            <p className="text-caption text-medium-black-tertiary mt-4 text-center">
              데이터 출처: {industryBenchmark.data_source} • 
              업데이트: {new Date(industryBenchmark.date_calculated).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={onSave}
          disabled={isLoading}
          className="flex-1 bg-medium-green hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Bookmark className="w-5 h-5 mr-2" />
          밸류에이션 저장
        </button>
        <button 
          onClick={onExport}
          disabled={isLoading}
          className="flex-1 bg-white hover:bg-medium-gray-light text-medium-black font-medium py-3 px-6 rounded-lg border border-medium-gray-border transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5 mr-2" />
          리포트 다운로드
        </button>
      </div>
    </div>
  )
}