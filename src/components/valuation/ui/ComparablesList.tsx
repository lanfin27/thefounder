'use client'

import { formatCurrency, formatMultiple } from '@/lib/valuation/utils'
import { ExternalLink, TrendingUp } from 'lucide-react'

interface ComparableCompany {
  id?: number
  title: string
  url?: string
  askingPrice?: number
  monthlyRevenue?: number
  monthlyProfit?: number
  profitMultiple?: number
  revenueMultiple?: number
  businessType?: string
  listingStatus?: string
  listingDate?: string
}

interface ComparablesListProps {
  comparables: ComparableCompany[]
  className?: string
}

export function ComparablesList({ comparables, className = '' }: ComparablesListProps) {
  if (comparables.length === 0) {
    return (
      <div className={`bg-white border border-medium-gray-border rounded-lg p-8 text-center ${className}`}>
        <TrendingUp className="w-12 h-12 text-medium-black-tertiary mx-auto mb-4" />
        <h3 className="text-heading-4 font-serif text-medium-black mb-2">
          비교 가능한 기업이 없습니다
        </h3>
        <p className="text-body text-medium-black-secondary">
          현재 산업 분야에서 유사한 거래 사례를 찾을 수 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-medium-gray-border rounded-lg overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-medium-gray-border">
        <h3 className="text-heading-4 font-serif text-medium-black flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-medium-black-secondary" />
          비교 가능한 거래 사례
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-medium-gray-border">
              <th className="px-6 py-3 text-left text-caption font-medium text-medium-black-secondary">
                기업명
              </th>
              <th className="px-6 py-3 text-right text-caption font-medium text-medium-black-secondary">
                매각가
              </th>
              <th className="px-6 py-3 text-right text-caption font-medium text-medium-black-secondary">
                월 매출
              </th>
              <th className="px-6 py-3 text-right text-caption font-medium text-medium-black-secondary">
                월 수익
              </th>
              <th className="px-6 py-3 text-right text-caption font-medium text-medium-black-secondary">
                P/E
              </th>
              <th className="px-6 py-3 text-right text-caption font-medium text-medium-black-secondary">
                P/S
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-medium-gray-border">
            {comparables.map((company, index) => (
              <tr key={company.id || index} className="hover:bg-medium-gray-light transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="text-body-small text-medium-black truncate max-w-xs">
                      {company.title}
                    </span>
                    {company.url && (
                      <a 
                        href={company.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-medium-black-tertiary hover:text-medium-green"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {company.businessType && (
                    <p className="text-caption text-medium-black-tertiary mt-1">
                      {company.businessType}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-small font-medium text-medium-black">
                    {company.askingPrice ? formatCurrency(company.askingPrice) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-small text-medium-black">
                    {company.monthlyRevenue ? formatCurrency(company.monthlyRevenue) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-small text-medium-black">
                    {company.monthlyProfit ? formatCurrency(company.monthlyProfit) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-small font-medium text-medium-green">
                    {company.profitMultiple ? formatMultiple(company.profitMultiple) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-body-small text-medium-black">
                    {company.revenueMultiple ? formatMultiple(company.revenueMultiple) : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {comparables.length > 0 && (
        <div className="px-6 py-3 bg-medium-gray-light text-center">
          <p className="text-caption text-medium-black-tertiary">
            * 실제 거래 사례를 기반으로 한 참고 자료입니다
          </p>
        </div>
      )}
    </div>
  )
}