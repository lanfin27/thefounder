'use client'

/**
 * Multi-Channel Trend Chart - Toss Securities Style
 *
 * 여러 채널의 영상당 조회수 추세를 함께 표시하는 토스증권 스타일 차트
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNumber, formatViewsPerVideo } from '@/lib/youtube-industry/utils'

interface MultiChannelTrendChartProps {
  data: Array<{
    channel: any
    history: Array<{ date: string; value: number; channel_id: string }>
  }>
}

// 차트용 색상 팔레트 (토스 스타일) - CategoryDetailView와 동일
const CHART_COLORS = [
  '#10b981', // 초록
  '#3b82f6', // 파랑
  '#f59e0b', // 주황
  '#8b5cf6', // 보라
  '#ef4444', // 빨강
]

export default function MultiChannelTrendChart({ data }: MultiChannelTrendChartProps) {
  // 데이터가 없으면 빈 상태 표시
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">차트 데이터가 없습니다.</p>
      </div>
    )
  }

  // 모든 날짜를 기준으로 데이터 병합
  const dates = data[0]?.history.map(h => h.date) || []

  // 각 날짜별로 모든 채널의 값을 하나의 객체로 병합
  const chartData = dates.map(date => {
    const dataPoint: any = {
      date,
      dateLabel: new Date(date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    }

    data.forEach((channelData, index) => {
      const historyPoint = channelData.history.find(h => h.date === date)
      dataPoint[`channel_${index}`] = historyPoint?.value || 0
    })

    return dataPoint
  })

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const dateLabel = payload[0].payload.dateLabel

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{dateLabel}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {data[index]?.channel.name}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {formatViewsPerVideo(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Custom Legend - 선택된 채널 목록과 변화율 표시
  const CustomLegend = () => (
    <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      {data.map((channelData, index) => {
        const latestValue = channelData.history[channelData.history.length - 1]?.value || 0
        const firstValue = channelData.history[0]?.value || 1
        const changeRate = ((latestValue - firstValue) / firstValue * 100)

        return (
          <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {channelData.channel.name}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatViewsPerVideo(latestValue)}
            </span>
            <span
              className={`text-sm font-semibold ${
                changeRate > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              ({changeRate > 0 ? '+' : ''}{changeRate.toFixed(1)}%)
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
          >
            <defs>
              {data.map((_, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                    stopOpacity={0.1}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_COLORS[index % CHART_COLORS.length]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              opacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="dateLabel"
              stroke="#9ca3af"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />

            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => formatViewsPerVideo(value)}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeDasharray: '5 5' }} />

            {data.map((channelData, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={`channel_${index}`}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: CHART_COLORS[index % CHART_COLORS.length],
                  stroke: '#fff',
                  strokeWidth: 2
                }}
                animationDuration={1000}
                animationEasing="ease-in-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend />
    </div>
  )
}
