'use client'

/**
 * Market Map View - Finviz Style Treemap
 *
 * Finviz.com 스타일의 Squarified Treemap 구현
 * - 완벽한 중앙 정렬
 * - 호버 시 상세 정보 표시
 * - 모든 카테고리 표시 (검은색 영역 없음)
 */

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { YCategoryCode } from '@/types/youtube-industry'
import { TreemapCategoryData } from '@/lib/youtube-industry/treemap-data-generator'

interface MarketMapViewProps {
  data: TreemapCategoryData[]
  selectedCategory: YCategoryCode | null
  onSelectCategory: (code: YCategoryCode | null) => void
  timestamp?: number
}

interface TreemapRect {
  code: string
  name: string
  emoji: string
  value: number
  normalizedValue: number
  avgViewsPerVideo: number
  dailyChange: number
  weeklyChange: number
  channelCount: number
  topChannels: any[]
  x: number
  y: number
  width: number
  height: number
}

// Squarified Treemap 알고리즘 구현 (Finviz 스타일)
function squarify(data: any[], x: number, y: number, width: number, height: number): TreemapRect[] {
  const normalizedData = normalize(data, width * height)
  const rects: TreemapRect[] = []
  squarifyRecursive(normalizedData, [], rects, x, y, width, height)
  return rects
}

function normalize(data: any[], area: number) {
  const sum = data.reduce((acc, d) => acc + d.value, 0)
  if (sum === 0) return data.map(d => ({ ...d, normalizedValue: area / data.length }))
  return data.map(d => ({
    ...d,
    normalizedValue: (d.value / sum) * area
  }))
}

function squarifyRecursive(
  children: any[],
  row: any[],
  rects: TreemapRect[],
  x: number,
  y: number,
  width: number,
  height: number
): void {
  if (children.length === 0) {
    layoutRow(row, rects, x, y, width, height)
    return
  }

  const shortestSide = Math.min(width, height)
  const child = children[0]
  const rowWithChild = [...row, child]

  if (row.length === 0 || worst(row, shortestSide) >= worst(rowWithChild, shortestSide)) {
    squarifyRecursive(children.slice(1), rowWithChild, rects, x, y, width, height)
  } else {
    const { newX, newY, newWidth, newHeight } = layoutRow(row, rects, x, y, width, height)
    squarifyRecursive(children, [], rects, newX, newY, newWidth, newHeight)
  }
}

function worst(row: any[], side: number): number {
  if (row.length === 0 || side === 0) return Infinity
  const sum = row.reduce((acc, d) => acc + d.normalizedValue, 0)
  if (sum === 0) return Infinity
  const max = Math.max(...row.map(d => d.normalizedValue))
  const min = Math.min(...row.map(d => d.normalizedValue))
  return Math.max(
    (side * side * max) / (sum * sum),
    (sum * sum) / (side * side * min)
  )
}

function layoutRow(
  row: any[],
  rects: TreemapRect[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  const sum = row.reduce((acc, d) => acc + d.normalizedValue, 0)

  if (width >= height) {
    // 가로로 레이아웃
    const rowWidth = height > 0 ? sum / height : 0
    let currentY = y

    row.forEach(item => {
      const itemHeight = rowWidth > 0 ? item.normalizedValue / rowWidth : 0
      rects.push({
        ...item,
        x: x,
        y: currentY,
        width: rowWidth,
        height: itemHeight
      })
      currentY += itemHeight
    })

    return {
      newX: x + rowWidth,
      newY: y,
      newWidth: width - rowWidth,
      newHeight: height
    }
  } else {
    // 세로로 레이아웃
    const rowHeight = width > 0 ? sum / width : 0
    let currentX = x

    row.forEach(item => {
      const itemWidth = rowHeight > 0 ? item.normalizedValue / rowHeight : 0
      rects.push({
        ...item,
        x: currentX,
        y: y,
        width: itemWidth,
        height: rowHeight
      })
      currentX += itemWidth
    })

    return {
      newX: x,
      newY: y + rowHeight,
      newWidth: width,
      newHeight: height - rowHeight
    }
  }
}

export default function MarketMapView({
  data,
  selectedCategory,
  onSelectCategory,
  timestamp
}: MarketMapViewProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'category' | 'channel'>('category')
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 })
  const [mounted, setMounted] = useState(false)
  const renderCount = useRef(0)
  renderCount.current += 1

  // ✅ CRITICAL: 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true)
    console.log('\n🗺️  [MarketMapView] Client mounted')
  }, [])

  // ✅ CRITICAL: Props 변경 로깅
  useEffect(() => {
    if (!mounted) return

    console.log('\n🗺️  [MarketMapView] Mounted/Updated')
    console.log('🗺️  [MarketMapView] Render count:', renderCount.current)
    console.log('🗺️  [MarketMapView] Timestamp:', timestamp ? new Date(timestamp).toISOString() : 'N/A')
    console.log('🗺️  [MarketMapView] Data items:', data.length)

    // 여행 카테고리 검증
    const travel = data.find(item => item.code === 'Y05')
    if (travel) {
      console.log('✅ [MarketMapView] Y05 여행 data:', {
        channels: travel.channels,
        subscribers: `${(travel.totalSubscribers / 1_000_000).toFixed(1)}M`,
        topChannels: travel.topChannels?.map(ch => ch.name),
        generatedAt: travel.generatedAt,
      })
    } else {
      console.warn('⚠️  [MarketMapView] Y05 여행 not found in data!')
    }
  }, [data, timestamp, mounted])

  // ✅ CRITICAL: 반응형 크기 조정 (Early return 전에 선언!)
  useEffect(() => {
    if (!mounted) return // 조건부 로직은 Hook 안에서

    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setDimensions({
          width: width > 0 ? width : 1200,
          height: 600
        })
      }
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [mounted])

  // ✅ 서버 또는 마운트 전에는 로딩 UI 반환 (모든 Hook 호출 후!)
  if (!mounted) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">지도맵 준비 중...</p>
      </div>
    )
  }

  // ❌ useMemo 제거 - Props 직접 사용
  // data는 이미 TreemapCategoryData 형식으로 들어옴
  const categoryData = data.map(item => ({
    code: item.code,
    name: item.name,
    emoji: item.icon,
    value: item.value || item.totalSubscribers,
    avgViewsPerVideo: (item.totalViews / (item.channels || 1)),
    dailyChange: item.dailyChangeRate,
    weeklyChange: item.weeklyChangeRate,
    channelCount: item.channels,
    topChannels: item.topChannels
  })).sort((a, b) => b.value - a.value)

  // ❌ useMemo 제거 - 직접 계산
  const hoveredInfo = hoveredCategory
    ? categoryData.find(c => c.code === hoveredCategory)
    : null

  // ❌ useMemo 제거 - 직접 계산 (강제 재계산)
  const treeMapRects = (dimensions.width <= 0 || dimensions.height <= 0)
    ? []
    : squarify(categoryData, 0, 0, dimensions.width, dimensions.height)

  // 색상 결정 함수 (Finviz 스타일)
  const getColorByChange = (change: number): string => {
    if (change >= 5) return '#10b981'      // 진한 초록
    if (change >= 2) return '#34d399'      // 초록
    if (change >= 0) return '#86efac'      // 연초록
    if (change >= -2) return '#fbbf24'     // 노랑
    if (change >= -5) return '#fb923c'     // 주황
    return '#ef4444'                        // 빨강
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>산업 지도</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              크기 = 평균 영상당 조회수 | 색상 = 일간 변화율
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('category')
                onSelectCategory(null)
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'category'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              산업별
            </button>
            <button
              onClick={() => {
                if (selectedCategory) {
                  setViewMode('channel')
                } else {
                  alert('먼저 산업 지도에서 카테고리를 클릭하세요')
                }
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'channel'
                  ? 'bg-blue-600 text-white'
                  : selectedCategory
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedCategory}
            >
              채널별
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={containerRef}
          className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden"
          style={{ width: '100%', height: `${dimensions.height}px` }}
        >
          {treeMapRects.map((rect, index) => (
            <div
              key={`${rect.code}-${index}-${timestamp}`}
              className="absolute border border-gray-300 dark:border-gray-700 overflow-hidden
                         cursor-pointer transition-all duration-150"
              style={{
                left: `${rect.x}px`,
                top: `${rect.y}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                backgroundColor: getColorByChange(rect.dailyChange),
                outline: hoveredCategory === rect.code ? '2px solid white' : 'none',
                zIndex: hoveredCategory === rect.code ? 10 : 1
              }}
              onMouseEnter={() => setHoveredCategory(rect.code)}
              onMouseLeave={() => setHoveredCategory(null)}
              onClick={() => {
                onSelectCategory(rect.code as YCategoryCode)
                setViewMode('category')
              }}
            >
              {/* 기본 표시 - 심플한 Finviz 스타일 */}
              <div className="h-full flex flex-col items-center justify-center text-white p-1">
                {rect.height > 30 && (
                  <div className="text-xl mb-0.5">{rect.emoji}</div>
                )}
                {rect.height > 50 && (
                  <div className="font-bold text-xs text-center truncate w-full px-1 mt-1">
                    {rect.name}
                  </div>
                )}
                {rect.height > 80 && rect.width > 100 && (
                  <div className="text-lg font-bold mt-1">
                    {rect.dailyChange > 0 ? '+' : ''}{rect.dailyChange.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 화면 중앙 고정 팝업 - Finviz 스타일 */}
          {hoveredInfo && (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl p-4 min-w-[300px]">
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">{hoveredInfo.emoji}</div>
                  <div className="font-bold text-2xl mb-4">{hoveredInfo.name}</div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-center gap-4">
                      <span>채널: <strong>{hoveredInfo.channelCount}개</strong></span>
                      <span>•</span>
                      <span>
                        평균: <strong>
                          {hoveredInfo.avgViewsPerVideo >= 1000000
                            ? `${(hoveredInfo.avgViewsPerVideo / 1000000).toFixed(2)}M`
                            : `${(hoveredInfo.avgViewsPerVideo / 1000).toFixed(0)}K`
                          }
                        </strong>/영상
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className={`text-2xl font-bold ${hoveredInfo.dailyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {hoveredInfo.dailyChange > 0 ? '+' : ''}{hoveredInfo.dailyChange.toFixed(2)}%
                      <span className="text-xs ml-2 opacity-80">일간</span>
                    </div>
                    <div className={`text-lg ${hoveredInfo.weeklyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {hoveredInfo.weeklyChange > 0 ? '+' : ''}{hoveredInfo.weeklyChange.toFixed(2)}%
                      <span className="text-xs ml-2 opacity-80">주간</span>
                    </div>
                  </div>

                  {hoveredInfo.topChannels && hoveredInfo.topChannels.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="font-semibold text-sm mb-3 opacity-90">상위 채널</div>
                      <div className="space-y-2 text-sm">
                        {hoveredInfo.topChannels.slice(0, 5).map((ch: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-left px-2">
                            <span className="truncate flex-1">{idx + 1}. {ch.name}</span>
                            <span className="ml-2 text-xs opacity-80 whitespace-nowrap">
                              {(ch.views_per_video || 0) >= 1000000
                                ? `${((ch.views_per_video || 0) / 1000000).toFixed(1)}M`
                                : `${((ch.views_per_video || 0) / 1000).toFixed(0)}K`
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 데이터 없음 표시 */}
          {treeMapRects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <div>데이터 로딩 중...</div>
              </div>
            </div>
          )}
        </div>

        {/* 색상 범례 - Finviz 스타일 */}
        <div className="flex items-center justify-center gap-6 mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex-wrap">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">변화율:</span>
          {[
            { color: '#10b981', label: '+5% 이상' },
            { color: '#34d399', label: '+2~5%' },
            { color: '#86efac', label: '0~+2%' },
            { color: '#fbbf24', label: '-2~0%' },
            { color: '#fb923c', label: '-5~-2%' },
            { color: '#ef4444', label: '-5% 이하' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>

        {/* 선택된 카테고리 정보 */}
        {selectedCategory && viewMode === 'category' && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                {(() => {
                  const selected = categoryData.find(c => c.code === selectedCategory)
                  if (!selected) return null
                  return (
                    <>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {selected.emoji} {selected.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {selected.channelCount}개 채널 •
                        평균 {selected.avgViewsPerVideo >= 1000000
                          ? `${(selected.avgViewsPerVideo / 1000000).toFixed(1)}M`
                          : `${(selected.avgViewsPerVideo / 1000).toFixed(0)}K`
                        } 조회/영상
                      </div>
                    </>
                  )
                })()}
              </div>
              <button
                onClick={() => {
                  // 카테고리 상세 페이지로 이동
                  window.location.href = `/youtube-industry/${selectedCategory}`
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                상세 보기 →
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
