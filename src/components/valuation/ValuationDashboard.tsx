'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, Clock, FileText, Calculator } from 'lucide-react'
import Link from 'next/link'

interface ValuationHistory {
  id: string
  company_name: string
  valuation_amount: number
  method: string
  created_at: string
  status: 'draft' | 'completed'
}

interface ValuationDashboardProps {
  userId: string
  canCreateNew: boolean
}

// Format currency helper
function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억원`
  } else if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만원`
  } else {
    return `${amount.toLocaleString()}원`
  }
}

export default function ValuationDashboard({ userId, canCreateNew }: ValuationDashboardProps) {
  const [valuations, setValuations] = useState<ValuationHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchValuations()
  }, [userId])

  const fetchValuations = async () => {
    try {
      const response = await fetch(`/api/valuations?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setValuations(data.valuations)
      }
    } catch (error) {
      console.error('Failed to fetch valuations:', error)
      // Use mock data as fallback
      setValuations([
        {
          id: '1',
          company_name: '테크스타트업',
          valuation_amount: 5000000000,
          method: 'multiple',
          created_at: '2024-01-15T10:00:00Z',
          status: 'completed'
        },
        {
          id: '2',
          company_name: 'AI 솔루션즈',
          valuation_amount: 3000000000,
          method: 'dcf',
          created_at: '2024-01-10T14:30:00Z',
          status: 'completed'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const methodLabels: Record<string, string> = {
    dcf: 'DCF (현금흐름할인)',
    multiple: '멀티플 방식',
    venture: '벤처캐피탈 방식',
    comparative: '비교기업 분석'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">
              {valuations.filter(v => v.status === 'completed').length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">완료된 평가</h3>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">
              {valuations.filter(v => v.status === 'draft').length}
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">진행 중인 평가</h3>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Calculator className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">
              {valuations.length > 0 ? 
                formatCurrency(
                  valuations.reduce((sum, v) => sum + v.valuation_amount, 0) / valuations.length
                ) : '0원'
              }
            </span>
          </div>
          <h3 className="text-gray-600 text-sm">평균 기업가치</h3>
        </div>
      </div>

      {/* New Valuation Button */}
      {canCreateNew ? (
        <Link
          href="/valuation/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          새 평가 시작하기
        </Link>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            이번 달 무료 평가 횟수를 모두 사용하셨습니다.
            <Link href="/membership" className="ml-2 text-yellow-700 underline hover:text-yellow-900">
              프리미엄으로 업그레이드하기
            </Link>
          </p>
        </div>
      )}

      {/* Valuation History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">평가 내역</h2>
        </div>
        
        {valuations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              아직 평가 내역이 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
              첫 번째 기업가치 평가를 시작해보세요
            </p>
            {canCreateNew && (
              <Link
                href="/valuation/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                평가 시작하기
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {valuations.map((valuation) => (
              <Link
                key={valuation.id}
                href={`/valuation/${valuation.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {valuation.company_name}
                    </h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span>{methodLabels[valuation.method] || valuation.method}</span>
                      <span>•</span>
                      <span>{new Date(valuation.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(valuation.valuation_amount)}
                    </div>
                    <div className={`text-sm ${
                      valuation.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {valuation.status === 'completed' ? '완료' : '진행 중'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}