'use client'

import { useEffect, useState } from 'react'
import { ValuationHistory } from '@/components/valuation/ui/ValuationHistory'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export default function ValuationHistoryPage() {
  const router = useRouter()
  const [valuations, setValuations] = useState<ValuationHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchValuations()
  }, [])

  const fetchValuations = async () => {
    try {
      const response = await fetch('/api/valuation/history')
      const data = await response.json()
      
      if (data.success) {
        setValuations(data.valuations || [])
      }
    } catch (error) {
      console.error('Failed to fetch valuations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleView = (id: string) => {
    router.push(`/valuation/${id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/valuation/save?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      if (data.success) {
        // Refresh the list
        fetchValuations()
      }
    } catch (error) {
      console.error('Failed to delete valuation:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/valuation"
            className="inline-flex items-center text-body-small text-medium-black-secondary hover:text-medium-green transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            밸류에이션 대시보드로 돌아가기
          </Link>
          
          <h1 className="text-heading-1 font-serif text-medium-black mb-3">
            밸류에이션 히스토리
          </h1>
          <p className="text-body text-medium-black-secondary leading-relaxed">
            저장된 기업가치 산정 결과를 확인하고 비교해보세요
          </p>
        </div>
        
        <ValuationHistory 
          valuations={valuations}
          onView={handleView}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}