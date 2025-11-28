'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

interface Channel {
  id: string
  channel_id: string
  name: string
  total_views: number
  video_count?: number
  subscribers: number
  thumbnail_url?: string
}

interface Props {
  categoryCode: string
  channels: Channel[]
  period: string
}

/**
 * Backward & Forward Fill: 누락된 데이터를 채우기
 *
 * Backward Fill: 첫 유효 값 이전 구간을 첫 값으로 채움
 * Forward Fill: 유효 값 이후 구간을 이전 값으로 채움
 *
 * 이를 통해 기간 필터(1m, 3m 등) 사용 시에도 그래프가
 * 기간 시작점부터 끝까지 완벽하게 연속됨
 */
function fillMissingData(
  mergedData: any[],
  selectedChannels: string[]
): any[] {
  if (!mergedData || mergedData.length === 0) {
    console.log('[Fill] ⚠️  No data to fill')
    return []
  }

  const lastValues: Record<string, number> = {}
  const firstValidValues: Record<string, { value: number; index: number }> = {}
  let totalFillCount = 0
  const channelFillCounts: Record<string, number> = {}
  const backwardFillCounts: Record<string, number> = {}
  const forwardFillCounts: Record<string, number> = {}

  // 각 채널의 fill 카운트 초기화 및 첫 유효 값 찾기
  selectedChannels.forEach(channelId => {
    const key = `channel_${channelId}`
    channelFillCounts[key] = 0
    backwardFillCounts[key] = 0
    forwardFillCounts[key] = 0

    // ✅ 각 채널의 첫 유효 값 찾기 (Backward Fill용)
    for (let i = 0; i < mergedData.length; i++) {
      const value = mergedData[i][key]
      if (value != null && value > 0) {
        firstValidValues[key] = { value, index: i }
        console.log(
          `[Backward Fill] ${channelId.slice(0, 12)}...: ` +
          `First valid at index ${i} (${mergedData[i].date}), value ${value.toLocaleString()}`
        )
        break
      }
    }
  })

  const filledData = mergedData.map((point, index) => {
    const filledPoint = { ...point }
    let pointHasFill = false

    selectedChannels.forEach(channelId => {
      const key = `channel_${channelId}`
      const value = point[key]

      if (value != null && value > 0) {
        // ✅ 유효한 값이면 저장하고 사용
        lastValues[key] = value
        filledPoint[key] = value
      } else if (firstValidValues[key] && index < firstValidValues[key].index) {
        // ✅ Backward Fill: 첫 유효 값 이전 구간
        filledPoint[key] = firstValidValues[key].value
        channelFillCounts[key]++
        backwardFillCounts[key]++
        totalFillCount++
        pointHasFill = true

        // 처음 3개 fill만 상세 로그
        if (backwardFillCounts[key] <= 3) {
          console.log(
            `[Backward Fill] ${channelId.slice(0, 12)}... at ${point.date}: ` +
            `${firstValidValues[key].value.toLocaleString()}`
          )
        }
      } else if (lastValues[key] != null) {
        // ✅ Forward Fill: 첫 유효 값 이후 구간
        filledPoint[key] = lastValues[key]
        channelFillCounts[key]++
        forwardFillCounts[key]++
        totalFillCount++
        pointHasFill = true

        // 처음 3개 fill만 상세 로그
        if (forwardFillCounts[key] <= 3) {
          console.log(
            `[Forward Fill] ${channelId.slice(0, 12)}... at ${point.date}: ` +
            `${lastValues[key].toLocaleString()}`
          )
        }
      }
      // 둘 다 없으면 undefined (데이터가 전혀 없는 채널)
    })

    return filledPoint
  })

  // 통계 출력
  const totalDataPoints = mergedData.length * selectedChannels.length
  const fillRate = totalDataPoints > 0 ? (totalFillCount / totalDataPoints * 100) : 0
  const totalBackwardFills = Object.values(backwardFillCounts).reduce((a, b) => a + b, 0)
  const totalForwardFills = Object.values(forwardFillCounts).reduce((a, b) => a + b, 0)

  console.log(`[Fill] 📊 Statistics:`)
  console.log(`  • Total data points: ${mergedData.length}`)
  console.log(`  • Total channel-date combinations: ${totalDataPoints}`)
  console.log(`  • Backward fills: ${totalBackwardFills}`)
  console.log(`  • Forward fills: ${totalForwardFills}`)
  console.log(`  • Total filled: ${totalFillCount}`)
  console.log(`  • Fill rate: ${fillRate.toFixed(1)}%`)

  // 채널별 통계
  console.log(`[Fill] 📈 By channel:`)
  selectedChannels.forEach(channelId => {
    const key = `channel_${channelId}`
    const backCount = backwardFillCounts[key]
    const forCount = forwardFillCounts[key]
    const totalCount = channelFillCounts[key]
    const rate = mergedData.length > 0 ? (totalCount / mergedData.length * 100) : 0
    console.log(
      `  • ${channelId.slice(0, 12)}...: ${totalCount} fills ` +
      `(B:${backCount}, F:${forCount}) ${rate.toFixed(1)}%`
    )
  })

  if (totalFillCount > 0) {
    console.log(`[Fill] ✅ Successfully filled ${totalFillCount} missing data points`)
  } else {
    console.log('[Fill] ✅ No missing data - all continuous!')
  }

  // 샘플 데이터 출력
  if (filledData.length > 0) {
    console.log(`[Fill] 📄 Sample data (first 2):`)
    filledData.slice(0, 2).forEach(point => {
      const channelData = selectedChannels.map(id => {
        const val = point[`channel_${id}`]
        return `${id.slice(0, 8)}: ${val ? Math.round(val).toLocaleString() : 'N/A'}`
      }).join(', ')
      console.log(`  ${point.date} → ${channelData}`)
    })
  }

  return filledData
}

export default function ChannelComparisonChart({ categoryCode, channels, period }: Props) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])

  // 초기 선택 (상위 3개 채널)
  useEffect(() => {
    const top3 = channels
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, 3)
      .map(ch => ch.channel_id)
    setSelectedChannels(top3)
  }, [channels])

  // 데이터 로드
  useEffect(() => {
    if (selectedChannels.length === 0) {
      setChartData([])
      return
    }
    loadComparisonData()
  }, [selectedChannels, period, categoryCode])

  const loadComparisonData = async () => {
    console.log('[Channel Comparison] Loading data for', selectedChannels.length, 'channels')
    setLoading(true)

    try {
      // 1. 산업 지수 데이터
      const categoryResponse = await fetch(
        `/api/youtube-industry/categories/${categoryCode}/history?period=${period}`
      )
      const categoryResult = await categoryResponse.json()

      if (!categoryResult.success) {
        console.error('[Channel Comparison] Category data error:', categoryResult.error)
      }

      // 2. 선택된 채널들 데이터
      const channelPromises = selectedChannels.map(channelId =>
        fetch(`/api/youtube-industry/channels/${channelId}/history?period=${period}`)
          .then(res => res.json())
      )

      const channelResults = await Promise.all(channelPromises)

      // 3. 데이터 병합 (null/0 값 제외)
      const dateMap: any = {}

      // 산업 지수 추가
      if (categoryResult.success && categoryResult.data.chartData) {
        categoryResult.data.chartData.forEach((point: any) => {
          // ✅ 유효한 값만 추가
          if (point.viewsPerVideo != null && point.viewsPerVideo > 0) {
            dateMap[point.date] = {
              date: point.date,
              timestamp: point.timestamp,
              categoryIndex: point.viewsPerVideo,
            }
          }
        })
      }

      // 각 채널 데이터 추가
      channelResults.forEach((result, index) => {
        if (!result.success || !result.data.chartData) return

        const channelId = selectedChannels[index]
        const channelKey = `channel_${channelId}`

        result.data.chartData.forEach((point: any) => {
          // ✅ 유효한 값만 추가
          if (point.viewsPerVideo != null && point.viewsPerVideo > 0) {
            if (!dateMap[point.date]) {
              dateMap[point.date] = {
                date: point.date,
                timestamp: point.timestamp,
              }
            }
            dateMap[point.date][channelKey] = point.viewsPerVideo
          }
        })
      })

      const mergedData = Object.values(dateMap)
        .sort((a: any, b: any) => a.timestamp - b.timestamp)

      console.log('[Channel Comparison] ✅ Merged:', mergedData.length, 'data points')

      // ✅ Forward Fill: 누락된 데이터를 이전 값으로 채우기
      const filledData = fillMissingData(mergedData, selectedChannels)

      // ✅ 10년 제한 검증 (all 기간일 때만)
      if (period === 'all' && filledData.length > 0) {
        const oldestDate = filledData[0]?.date
        const newestDate = filledData[filledData.length - 1]?.date
        const tenYearsAgo = new Date()
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
        const tenYearsAgoStr = tenYearsAgo.toISOString().split('T')[0]

        // 10년 이전 데이터가 있는지 체크
        const olderThan10Years = filledData.filter(point =>
          new Date(point.date) < tenYearsAgo
        )

        console.log(`[Channel Comparison] 📊 10-year validation:`, {
          totalPoints: filledData.length,
          dateRange: `${oldestDate} ~ ${newestDate}`,
          tenYearLimit: tenYearsAgoStr,
          olderThan10Years: olderThan10Years.length,
          withinLimit: olderThan10Years.length === 0 ? '✅' : '⚠️',
        })

        // 만약 10년 이전 데이터가 있다면 필터링 (추가 안전장치)
        if (olderThan10Years.length > 0) {
          console.warn(`[Channel Comparison] ⚠️  Filtering ${olderThan10Years.length} points older than 10 years`)
          const filtered = filledData.filter(point => new Date(point.date) >= tenYearsAgo)
          setChartData(filtered)
          return
        }
      }

      console.log('[Channel Comparison] 📊 Data quality:', {
        categoryData: categoryResult.data?.chartData?.length || 0,
        channelResults: channelResults.map((r, i) => ({
          channelId: selectedChannels[i],
          points: r.data?.chartData?.length || 0,
        })),
        mergedPoints: mergedData.length,
        filledPoints: filledData.length,
      })
      setChartData(filledData)

    } catch (error) {
      console.error('[Channel Comparison] ❌ Error:', error)
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => {
      if (prev.includes(channelId)) {
        // Deselect
        return prev.filter(id => id !== channelId)
      } else {
        // Select (max 6 channels)
        if (prev.length >= 6) {
          alert('최대 6개 채널까지만 비교할 수 있습니다')
          return prev
        }
        return [...prev, channelId]
      }
    })
  }

  const formatValue = (value: number) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B'
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
    return value.toString()
  }

  const getChannelColor = (index: number) => {
    const colors = ['#3b82f6', '#f97316', '#8b5cf6', '#f59e0b', '#14b8a6', '#ef4444']
    return colors[index % colors.length]
  }

  if (loading && chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      {/* 헤더 */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          채널별 성과 비교
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          비교할 채널을 선택하세요 (최대 6개)
        </p>
      </div>

      {/* 채널 선택 리스트 */}
      <div className="mb-6 max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg">
        {channels.map((channel) => {
          const isSelected = selectedChannels.includes(channel.channel_id)
          const viewsPerVideo = (channel.video_count ?? 0) > 0
            ? channel.total_views / (channel.video_count ?? 1)
            : 0

          return (
            <div
              key={channel.id}
              className={`flex items-center gap-4 p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => toggleChannel(channel.channel_id)}
            >
              {/* 체크박스 */}
              <div className="flex-shrink-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>

              {/* 썸네일 */}
              <div className="flex-shrink-0">
                {channel.thumbnail_url ? (
                  <img
                    src={channel.thumbnail_url}
                    alt={channel.name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl">
                    📺
                  </div>
                )}
              </div>

              {/* 채널 정보 */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-white truncate">
                  {channel.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  구독자 {formatValue(channel.subscribers)} • {formatValue(channel.video_count ?? 0)}개 영상
                </div>
              </div>

              {/* 영상당 조회수 */}
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-lg text-gray-900 dark:text-white">
                  {formatValue(viewsPerVideo)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">영상당 조회수</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 비교 그래프 */}
      {selectedChannels.length > 0 && chartData.length > 0 ? (
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-center gap-2">
            <span className="font-medium">선택된 채널: {selectedChannels.length}개</span>
            {loading && (
              <span className="inline-flex items-center gap-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>로딩 중...</span>
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) => format(new Date(ts), 'MM/dd')}
                stroke="#9ca3af"
              />
              <YAxis
                tickFormatter={formatValue}
                stroke="#9ca3af"
              />
              <Tooltip
                formatter={(value: any) => formatValue(value)}
                labelFormatter={(ts) => format(new Date(ts), 'yyyy-MM-dd')}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />

              {/* 산업 지수 라인 */}
              <Line
                type="monotone"
                dataKey="categoryIndex"
                name="산업 지수"
                stroke="#10b981"
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                activeDot={{ r: 6 }}
              />

              {/* 각 채널 라인 */}
              {selectedChannels.map((channelId, index) => {
                const channel = channels.find(ch => ch.channel_id === channelId)
                return (
                  <Line
                    key={channelId}
                    type="monotone"
                    dataKey={`channel_${channelId}`}
                    name={channel?.name || 'Unknown'}
                    stroke={getChannelColor(index)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                    activeDot={{ r: 6 }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : selectedChannels.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p>비교할 채널을 선택해주세요</p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">⏳</div>
          <p>데이터 로딩 중...</p>
        </div>
      )}
    </div>
  )
}
