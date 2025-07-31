'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  LineChart, 
  Line, 
  Area, 
  AreaChart,
  Bar,
  BarChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts'
import { fetchIndustryDetail, calculateMovingAverage } from '@/lib/api/charts'
import { IndustryChartData, formatChartDate, formatChartValue, formatPercentChange, getChangeColor } from '@/types/charts'
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  Activity,
  BarChart3,
  Info,
  Download,
  Share2,
  Loader2
} from 'lucide-react'

interface IndustryChartDetailProps {
  industry: string
  initialData?: IndustryChartData
}

export default function IndustryChartDetail({ 
  industry,
  initialData 
}: IndustryChartDetailProps) {
  const router = useRouter()
  const [data, setData] = useState<IndustryChartData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [timeRange, setTimeRange] = useState(30)
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')
  const [showMovingAvg, setShowMovingAvg] = useState(false)

  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
  }, [industry, timeRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await fetchIndustryDetail(industry, timeRange)
      if (result) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch detail data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">데이터를 불러올 수 없습니다.</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    )
  }

  // Prepare chart data with moving average
  const chartData = data.chartData.map((point, index) => ({
    ...point,
    formattedDate: formatChartDate(point.date, timeRange),
    movingAvg: showMovingAvg ? calculateMovingAverage(data.chartData, 7)[index] : null
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className={`text-sm font-bold ${getChangeColor(data.changePercent)}`}>
            {formatChartValue(payload[0].value)}
          </p>
          {payload[0].payload.volume && (
            <p className="text-xs text-gray-500 mt-1">
              거래량: {payload[0].payload.volume}건
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 10, bottom: 10 }
    }

    const lineColor = data.trend === 'up' ? '#DC2626' : data.trend === 'down' ? '#2563EB' : '#6B7280'
    const fillColor = data.trend === 'up' ? '#DC2626' : data.trend === 'down' ? '#2563EB' : '#6B7280'

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={data.stats.avg30d} stroke="#999" strokeDasharray="5 5" />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: lineColor }}
            />
            {showMovingAvg && (
              <Line 
                type="monotone" 
                dataKey="movingAvg" 
                stroke="#999"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </LineChart>
        )
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 'dataMax + 0.5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              fill={fillColor}
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        )
      
      default: // area
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fillColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={fillColor} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={data.stats.avg30d} stroke="#999" strokeDasharray="5 5" />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#colorGradient)"
            />
            {showMovingAvg && (
              <Line 
                type="monotone" 
                dataKey="movingAvg" 
                stroke="#999"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </AreaChart>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            돌아가기
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {data.industry} 산업 배수 트렌드
              </h1>
              <div className="flex items-center gap-4 text-lg">
                <span className="font-bold text-2xl">{formatChartValue(data.current)}</span>
                <span className={`flex items-center gap-1 ${getChangeColor(data.changePercent)}`}>
                  {formatPercentChange(data.changePercent)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-md">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-md">
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          {/* Time Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded-md px-3 py-1"
            >
              <option value={7}>1주</option>
              <option value={30}>1개월</option>
              <option value={90}>3개월</option>
              <option value={180}>6개월</option>
              <option value={365}>1년</option>
            </select>
          </div>

          {/* Chart Type */}
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <div className="flex gap-1 bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 text-sm rounded ${chartType === 'area' ? 'bg-white shadow-sm' : ''}`}
              >
                영역
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-sm rounded ${chartType === 'line' ? 'bg-white shadow-sm' : ''}`}
              >
                선
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-sm rounded ${chartType === 'bar' ? 'bg-white shadow-sm' : ''}`}
              >
                막대
              </button>
            </div>
          </div>

          {/* Moving Average Toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showMovingAvg}
              onChange={(e) => setShowMovingAvg(e.target.checked)}
              className="rounded"
            />
            7일 이동평균선
          </label>
        </div>

        {/* Main Chart */}
        <motion.div 
          className="bg-white rounded-lg shadow-sm p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div 
            className="bg-white rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-sm text-gray-500 mb-1">30일 최고</div>
            <div className="text-2xl font-bold text-red-600">{formatChartValue(data.stats.high30d)}</div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-sm text-gray-500 mb-1">30일 최저</div>
            <div className="text-2xl font-bold text-blue-600">{formatChartValue(data.stats.low30d)}</div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-sm text-gray-500 mb-1">30일 평균</div>
            <div className="text-2xl font-bold text-gray-900">{formatChartValue(data.stats.avg30d)}</div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-sm text-gray-500 mb-1">총 거래건수</div>
            <div className="text-2xl font-bold text-gray-900">{data.stats.totalTransactions}건</div>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div 
          className="bg-blue-50 rounded-lg p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">데이터 안내</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>표시된 배수는 실제 M&A 거래 사례를 기반으로 산출됩니다.</li>
                <li>산업 평균값으로 개별 기업의 실제 가치와는 차이가 있을 수 있습니다.</li>
                <li>회색 점선은 선택 기간의 평균값을 나타냅니다.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}