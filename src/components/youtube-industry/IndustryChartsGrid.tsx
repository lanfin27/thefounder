'use client'

/**
 * Industry Charts Grid Component
 * 모든 산업의 미니 차트를 그리드 형태로 표시
 */

import { useState } from 'react'
import { IndustryMiniChart } from './IndustryMiniChart'

interface Industry {
  code: string
  name: string
  emoji?: string
  icon?: string
}

interface IndustryChartsGridProps {
  categories: Industry[]
}

export function IndustryChartsGrid({ categories }: IndustryChartsGridProps) {
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('1m')

  console.log('[IndustryChartsGrid] Rendering with:', {
    categoriesCount: categories.length,
    period
  })

  if (!categories || categories.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          산업 데이터가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            산업별 트렌드
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            각 산업의 최근 트렌드를 한눈에 확인하세요
          </p>
        </div>

        <div className="flex gap-2">
          {[
            { value: '1m', label: '1개월' },
            { value: '3m', label: '3개월' },
            { value: '6m', label: '6개월' },
            { value: '1y', label: '1년' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === option.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <IndustryMiniChart
            key={category.code}
            categoryCode={category.code}
            categoryName={category.name}
            categoryIcon={category.emoji || category.icon || '📊'}
            period={period}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          각 차트를 클릭하면 해당 산업의 상세 페이지로 이동합니다
        </p>
      </div>
    </div>
  )
}
