'use client'

/**
 * Industry Rank Table Component
 *
 * 산업별 순위 테이블 (정렬 기능 포함)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react'
import { YCategory, YCategoryCode } from '@/types/youtube-industry'
import { formatNumber, formatChangeRate } from '@/lib/youtube-industry/utils'

interface IndustryRankTableProps {
  categories: YCategory[]
  onSelectCategory: (code: YCategoryCode) => void
}

type SortField = 'viewsPerVideo' | 'dailyChange' | 'weeklyChange' | 'marketShare' | 'volatility'
type SortOrder = 'asc' | 'desc'

export default function IndustryRankTable({
  categories,
  onSelectCategory
}: IndustryRankTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('viewsPerVideo')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterType, setFilterType] = useState<'all' | 'up' | 'down'>('all')

  // 카테고리 클릭 핸들러
  const handleCategoryClick = (categoryCode: YCategoryCode) => {
    console.log('[IndustryRankTable] Category clicked:', categoryCode)
    console.log('[IndustryRankTable] Navigating to:', `/youtube-industry/${categoryCode}`)
    router.push(`/youtube-industry/${categoryCode}`)
  }

  // Sort categories with null safety
  const sortedCategories = [...categories].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortField) {
      case 'viewsPerVideo':
        aValue = a.metrics?.averageViewsPerVideo || 0
        bValue = b.metrics?.averageViewsPerVideo || 0
        break
      case 'dailyChange':
        aValue = a.metrics?.dailyChange || 0
        bValue = b.metrics?.dailyChange || 0
        break
      case 'weeklyChange':
        aValue = a.metrics?.weeklyChange || 0
        bValue = b.metrics?.weeklyChange || 0
        break
      case 'marketShare':
        aValue = a.metrics?.marketShare || 0
        bValue = b.metrics?.marketShare || 0
        break
      case 'volatility':
        aValue = a.metrics?.volatility || 0
        bValue = b.metrics?.volatility || 0
        break
      default:
        return 0
    }

    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
  })

  // Filter categories with null safety
  const filteredCategories = sortedCategories.filter((cat) => {
    const dailyChange = cat.metrics?.dailyChange || 0
    if (filterType === 'up') return dailyChange > 0
    if (filterType === 'down') return dailyChange < 0
    return true
  })

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // Sort icon
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortOrder === 'desc' ? (
      <ArrowDown className="w-4 h-4 text-gray-900 dark:text-white" />
    ) : (
      <ArrowUp className="w-4 h-4 text-gray-900 dark:text-white" />
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
          필터:
        </span>
        {[
          { value: 'all', label: '전체', icon: null },
          { value: 'up', label: '상승', icon: TrendingUp },
          { value: 'down', label: '하락', icon: TrendingDown }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterType(filter.value as typeof filterType)}
            className={`
              flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
              ${
                filterType === filter.value
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            {filter.icon && <filter.icon className="w-4 h-4" />}
            {filter.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {filteredCategories.length}개 산업
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                순위
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                산업
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('viewsPerVideo')}
              >
                <div className="flex items-center justify-end gap-1">
                  영상당 조회수
                  <SortIcon field="viewsPerVideo" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('dailyChange')}
              >
                <div className="flex items-center justify-end gap-1">
                  일간 변화
                  <SortIcon field="dailyChange" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('weeklyChange')}
              >
                <div className="flex items-center justify-end gap-1">
                  주간 변화
                  <SortIcon field="weeklyChange" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('marketShare')}
              >
                <div className="flex items-center justify-end gap-1">
                  시장 점유율
                  <SortIcon field="marketShare" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCategories.map((category, index) => (
              <tr
                key={category.code}
                onClick={() => handleCategoryClick(category.code)}
                className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                  #{index + 1}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {category.nameEn}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {formatNumber(category.metrics?.averageViewsPerVideo || 0)}
                </td>
                <td
                  className={`px-4 py-3 whitespace-nowrap text-right text-sm font-semibold ${
                    (category.metrics?.dailyChange || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatChangeRate(category.metrics?.dailyChange || 0)}
                </td>
                <td
                  className={`px-4 py-3 whitespace-nowrap text-right text-sm font-semibold ${
                    (category.metrics?.weeklyChange || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatChangeRate(category.metrics?.weeklyChange || 0)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                  {(category.metrics?.marketShare || 0).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            선택한 조건에 맞는 데이터가 없습니다.
          </p>
        </div>
      )}
    </div>
  )
}
