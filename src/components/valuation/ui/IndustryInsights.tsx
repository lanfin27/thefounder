'use client'

import { TrendingUp, AlertCircle, Lightbulb, BarChart3 } from 'lucide-react'
import { getIndustryInsights } from '@/lib/valuation/utils'

interface IndustryInsightsProps {
  industry: string
  className?: string
}

export function IndustryInsights({ industry, className = '' }: IndustryInsightsProps) {
  const insights = getIndustryInsights(industry)

  return (
    <div className={`bg-white border border-medium-gray-border rounded-lg overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-medium-gray-border">
        <h3 className="text-heading-4 font-serif text-medium-black flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-medium-black-secondary" />
          {industry} 산업 인사이트
        </h3>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Trends */}
        <div>
          <div className="flex items-center mb-3">
            <TrendingUp className="w-5 h-5 text-medium-green mr-2" />
            <h4 className="text-body font-medium text-medium-black">주요 트렌드</h4>
          </div>
          <ul className="space-y-2">
            {insights.trends.map((trend, index) => (
              <li key={index} className="flex items-start">
                <span className="text-medium-green mr-2">•</span>
                <span className="text-body-small text-medium-black-secondary">{trend}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div>
          <div className="flex items-center mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <h4 className="text-body font-medium text-medium-black">주요 리스크</h4>
          </div>
          <ul className="space-y-2">
            {insights.risks.map((risk, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span className="text-body-small text-medium-black-secondary">{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div>
          <div className="flex items-center mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="text-body font-medium text-medium-black">성장 기회</h4>
          </div>
          <ul className="space-y-2">
            {insights.opportunities.map((opportunity, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span className="text-body-small text-medium-black-secondary">{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}