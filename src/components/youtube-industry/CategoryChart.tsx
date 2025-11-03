'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

interface ChartData {
  date: string
  viewsPerVideo: number
  timestamp: number
}

interface CategoryChartProps {
  categoryCode: string
  onPeriodChange?: (period: string) => void
}

export default function CategoryChart({ categoryCode, onPeriodChange }: CategoryChartProps) {
  const [period, setPeriod] = useState('all')

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [currentValue, setCurrentValue] = useState(0)
  const [changes, setChanges] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
  })
  const [isSampleData, setIsSampleData] = useState(false)

  useEffect(() => {
    loadChartData()
  }, [categoryCode, period])

  const loadChartData = async () => {
    console.log('[Category Chart] Loading data for:', categoryCode, period)
    setLoading(true)

    try {
      const response = await fetch(
        `/api/youtube-industry/categories/${categoryCode}/history?period=${period}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch chart data')
      }

      const result = await response.json()

      console.log('[Category Chart] Success:', {
        dataPoints: result.data.chartData.length,
        currentValue: result.data.currentValue,
        isSample: !!result.note,
      })

      setChartData(result.data.chartData)
      setCurrentValue(result.data.currentValue)
      setChanges(result.data.changes)
      setIsSampleData(!!result.note)

    } catch (error) {
      console.error('[Category Chart] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B'
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
    return value.toString()
  }

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getChartColor = () => {
    if (changes.monthly > 0) return '#10b981' // green
    if (changes.monthly < 0) return '#ef4444' // red
    return '#6b7280' // gray
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">영상당 조회수</h3>
          {isSampleData && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              샘플 데이터
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatValue(currentValue)}
          </span>
          <span className={`text-xl font-semibold ${getChangeColor(changes.monthly)}`}>
            {formatChange(changes.monthly)}
            {changes.monthly > 0 ? ' ↑' : changes.monthly < 0 ? ' ↓' : ''}
          </span>
        </div>

        {/* 기간 선택 버튼 */}
        <div className="flex gap-2">
          {[
            { value: '1m', label: '1개월' },
            { value: '3m', label: '3개월' },
            { value: '6m', label: '6개월' },
            { value: '1y', label: '1년' },
            { value: 'all', label: '전체' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === p.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 변화율 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">일간 변화</div>
          <div className={`text-2xl font-bold ${getChangeColor(changes.daily)}`}>
            {formatChange(changes.daily)}
            {changes.daily > 0 ? ' ↑' : changes.daily < 0 ? ' ↓' : ''}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">주간 변화</div>
          <div className={`text-2xl font-bold ${getChangeColor(changes.weekly)}`}>
            {formatChange(changes.weekly)}
            {changes.weekly > 0 ? ' ↑' : changes.weekly < 0 ? ' ↓' : ''}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">월간 변화</div>
          <div className={`text-2xl font-bold ${getChangeColor(changes.monthly)}`}>
            {formatChange(changes.monthly)}
            {changes.monthly > 0 ? ' ↑' : changes.monthly < 0 ? ' ↓' : ''}
          </div>
        </div>
      </div>

      {/* 메인 차트 */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(timestamp) => {
                // Show years for multi-year data
                if (period === 'all' || period === '1y') {
                  return format(new Date(timestamp), 'yyyy-MM/dd')
                }
                return format(new Date(timestamp), 'MM/dd')
              }}
              angle={period === 'all' || period === '1y' ? -45 : 0}
              textAnchor={period === 'all' || period === '1y' ? 'end' : 'middle'}
              height={period === 'all' || period === '1y' ? 80 : 50}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={(value) => formatValue(value)}
              stroke="#9ca3af"
            />
            <Tooltip
              formatter={(value: any) => [formatValue(value), '영상당 조회수']}
              labelFormatter={(timestamp) => format(new Date(timestamp), 'yyyy-MM-dd')}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="viewsPerVideo"
              stroke={getChartColor()}
              strokeWidth={2}
              dot={false}
              connectNulls={true}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 안내 메시지 */}
      {isSampleData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>샘플 데이터입니다.</strong> 실제 데이터를 보려면{' '}
            <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
              npx tsx scripts/generate-sample-history.ts
            </code>{' '}
            스크립트를 실행하세요.
          </p>
        </div>
      )}
    </div>
  )
}
