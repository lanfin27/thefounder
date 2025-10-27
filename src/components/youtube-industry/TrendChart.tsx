'use client'

/**
 * Trend Chart Component - Toss Style
 *
 * 토스증권 스타일의 트렌드 차트 (Recharts 사용)
 */

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNumber } from '@/lib/youtube-industry/utils'

interface TrendChartProps {
  data: Array<{
    date: string
    value: number
  }>
  height?: number
}

export default function TrendChart({ data, height = 300 }: TrendChartProps) {
  // 데이터 포맷팅
  const formattedData = data.map((item) => ({
    ...item,
    dateLabel: new Date(item.date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }))

  // 차트 색상 결정 (첫 값과 마지막 값 비교)
  const isPositive = data.length > 1 && data[data.length - 1].value >= data[0].value

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm text-gray-400 mb-1">{data.dateLabel}</p>
        <p className="text-lg font-bold text-white">
          {formatNumber(data.value)}
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />

          <XAxis
            dataKey="dateLabel"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={{ stroke: '#374151' }}
          />

          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={{ stroke: '#374151' }}
            tickFormatter={(value) => formatNumber(value)}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6b7280', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={2}
            fill="url(#colorValue)"
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
