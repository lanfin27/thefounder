'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatCurrency, formatKoreanWon, formatMultiple } from '@/lib/valuation/utils'
import { Clock, TrendingUp, Building2, FileText, Trash2, Eye } from 'lucide-react'

interface ValuationHistoryItem {
  id: string
  companyName: string
  industry: string
  valuationMethod: string
  estimatedValue: number
  multiple: number
  currency: string
  isDraft: boolean
  createdAt: string
  updatedAt: string
}

interface ValuationHistoryProps {
  valuations: ValuationHistoryItem[]
  onView: (id: string) => void
  onDelete: (id: string) => void
  isLoading?: boolean
}

export function ValuationHistory({ valuations, onView, onDelete, isLoading }: ValuationHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('이 밸류에이션을 삭제하시겠습니까?')) {
      setDeletingId(id)
      await onDelete(id)
      setDeletingId(null)
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'dcf': return 'DCF'
      case 'multiple': return '멀티플'
      case 'comparable': return '비교평가'
      case 'venture': return '벤처'
      default: return method
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-medium-gray-border rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-medium-green border-t-transparent" />
          <span className="ml-3 text-body text-medium-black-secondary">로딩 중...</span>
        </div>
      </div>
    )
  }

  if (valuations.length === 0) {
    return (
      <div className="bg-white border border-medium-gray-border rounded-lg p-8 text-center">
        <Clock className="w-12 h-12 text-medium-black-tertiary mx-auto mb-4" />
        <h3 className="text-heading-4 font-serif text-medium-black mb-2">
          저장된 밸류에이션이 없습니다
        </h3>
        <p className="text-body text-medium-black-secondary">
          첫 번째 기업가치 평가를 시작해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-medium-gray-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-medium-gray-border">
        <h3 className="text-heading-4 font-serif text-medium-black flex items-center">
          <Clock className="w-5 h-5 mr-2 text-medium-black-secondary" />
          밸류에이션 히스토리
        </h3>
      </div>
      
      <div className="divide-y divide-medium-gray-border">
        {valuations.map((valuation) => (
          <div 
            key={valuation.id} 
            className="px-6 py-4 hover:bg-medium-gray-light transition-colors duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-4 h-4 text-medium-black-secondary flex-shrink-0" />
                  <h4 className="text-body font-medium text-medium-black truncate">
                    {valuation.companyName}
                  </h4>
                  {valuation.isDraft && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium bg-yellow-100 text-yellow-800">
                      임시저장
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-caption text-medium-black-tertiary">업종</p>
                    <p className="text-body-small text-medium-black">{valuation.industry}</p>
                  </div>
                  <div>
                    <p className="text-caption text-medium-black-tertiary">평가방법</p>
                    <p className="text-body-small text-medium-black">{getMethodLabel(valuation.valuationMethod)}</p>
                  </div>
                  <div>
                    <p className="text-caption text-medium-black-tertiary">기업가치</p>
                    <p className="text-body-small font-medium text-medium-green">
                      {valuation.currency === 'KRW' 
                        ? formatKoreanWon(valuation.estimatedValue)
                        : formatCurrency(valuation.estimatedValue, valuation.currency as 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-medium-black-tertiary">멀티플</p>
                    <p className="text-body-small text-medium-black">{formatMultiple(valuation.multiple)}</p>
                  </div>
                </div>
                
                <p className="text-caption text-medium-black-tertiary">
                  {formatDistanceToNow(new Date(valuation.createdAt), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onView(valuation.id)}
                  className="p-2 text-medium-black-secondary hover:text-medium-green hover:bg-medium-gray-light rounded-lg transition-colors duration-200"
                  title="상세보기"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(valuation.id)}
                  disabled={deletingId === valuation.id}
                  className="p-2 text-medium-black-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  title="삭제"
                >
                  {deletingId === valuation.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-500 border-t-transparent" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}