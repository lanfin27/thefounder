'use client'

import { Metadata } from 'next'
import { ValuationForm } from '@/components/valuation/ui/ValuationForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// export const metadata: Metadata = {
//   title: '새 밸류에이션 | The Founder',
//   description: '새로운 기업가치를 산정하고 저장하세요',
// }

export default function NewValuationPage() {
  const router = useRouter()
  const [isCalculating, setIsCalculating] = useState(false)

  const handleSubmit = async (data: any) => {
    setIsCalculating(true)
    
    try {
      const response = await fetch('/api/valuation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Store the result in sessionStorage to pass to results page
        sessionStorage.setItem('valuationResult', JSON.stringify({
          valuation: result.valuation,
          industryBenchmark: result.industryBenchmark,
          companyName: data.companyName,
          inputData: data
        }))
        
        // Redirect to valuation dashboard with results tab
        router.push('/valuation?tab=results')
      } else {
        console.error('Valuation calculation failed:', result.error)
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Valuation calculation error:', error)
      // TODO: Show error message to user
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/valuation"
            className="inline-flex items-center text-body-small text-medium-black-secondary hover:text-medium-green transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            밸류에이션 대시보드로 돌아가기
          </Link>
          
          <h1 className="text-heading-1 font-serif text-medium-black mb-3">
            새로운 기업가치 산정
          </h1>
          <p className="text-body text-medium-black-secondary leading-relaxed">
            회사의 재무 정보를 입력하여 전문적인 기업가치를 산정해보세요
          </p>
        </div>

        <ValuationForm 
          onSubmit={handleSubmit}
          isLoading={isCalculating}
        />
      </div>
    </div>
  )
}