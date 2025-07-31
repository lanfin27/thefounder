'use client'

import { useState, useEffect } from 'react'
import { ValuationForm } from './ui/ValuationForm'
import { ValuationResults } from './ui/ValuationResults'
import { ValuationHistory } from './ui/ValuationHistory'
import { IndustryInsights } from './ui/IndustryInsights'
import { MetricCard } from './ui/MetricCard'
import { ComparablesList } from './ui/ComparablesList'
import { Calculator, TrendingUp, BarChart3, History, Lightbulb, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface UserStats {
  totalValuations: number
  averageMultiple: number
  industryBreakdown: Record<string, number>
  recentActivity: Array<{ date: string; count: number }>
}

export function ValuationDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  
  const [currentValuation, setCurrentValuation] = useState<any>(null)
  const [industryBenchmark, setIndustryBenchmark] = useState<any>(null)
  const [comparables, setComparables] = useState<any[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('SaaS')
  
  // User stats
  const [userStats, setUserStats] = useState<UserStats>({
    totalValuations: 0,
    averageMultiple: 0,
    industryBreakdown: {},
    recentActivity: []
  })
  
  const [recentValuations, setRecentValuations] = useState<any[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    // Check for valuation result from new valuation page
    const storedResult = sessionStorage.getItem('valuationResult')
    if (storedResult) {
      const result = JSON.parse(storedResult)
      setCurrentValuation(result.valuation)
      setIndustryBenchmark(result.industryBenchmark)
      setCompanyName(result.companyName)
      setActiveTab('results')
      sessionStorage.removeItem('valuationResult')
    }
    
    fetchUserStats()
    fetchRecentValuations()
  }, [])

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/valuation/history')
      const data = await response.json()
      
      if (data.success && data.stats) {
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchRecentValuations = async () => {
    try {
      const response = await fetch('/api/valuation/history?limit=5')
      const data = await response.json()
      
      if (data.success) {
        setRecentValuations(data.valuations || [])
      }
    } catch (error) {
      console.error('Failed to fetch recent valuations:', error)
    }
  }

  const handleValuationSubmit = async (input: any) => {
    setIsCalculating(true)
    setCompanyName(input.companyName)
    setSelectedIndustry(input.industry)
    
    try {
      const response = await fetch('/api/valuation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      })
      
      const data = await response.json()
      if (data.success) {
        setCurrentValuation(data.valuation)
        setIndustryBenchmark(data.industryBenchmark)
        setComparables(data.comparables || [])
        setActiveTab('results')
      } else {
        console.error('Valuation calculation failed:', data.error)
      }
    } catch (error) {
      console.error('Valuation calculation error:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSaveValuation = async () => {
    if (!currentValuation || !companyName) return
    
    try {
      const response = await fetch('/api/valuation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          industry: selectedIndustry,
          inputData: {}, // Would include original input
          results: currentValuation
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Refresh stats and history
        fetchUserStats()
        fetchRecentValuations()
        // TODO: Show success message
      }
    } catch (error) {
      console.error('Save valuation error:', error)
    }
  }

  const handleViewValuation = (id: string) => {
    router.push(`/valuation/${id}`)
  }

  const handleDeleteValuation = async (id: string) => {
    try {
      const response = await fetch(`/api/valuation/save?id=${id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      if (data.success) {
        fetchRecentValuations()
        fetchUserStats()
      }
    } catch (error) {
      console.error('Failed to delete valuation:', error)
    }
  }

  const getGradeFromStats = () => {
    if (userStats.averageMultiple >= 4) return 75
    if (userStats.averageMultiple >= 3) return 60
    if (userStats.averageMultiple >= 2) return 40
    return 20
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12 bg-gradient-to-br from-medium-green-light via-white to-blue-50 rounded-2xl border border-medium-gray-border">
        <h1 className="text-heading-1 font-serif text-medium-black mb-4">
          기업가치 산정 대시보드
        </h1>
        <p className="text-body text-medium-black-secondary mb-8 leading-relaxed max-w-3xl mx-auto">
          1인 창업가를 위한 전문적인 밸류에이션 도구로 비즈니스의 정확한 시장가치를 산정하세요
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/valuation/new"
            className="inline-flex items-center justify-center px-6 py-3 bg-medium-green hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <Calculator className="w-5 h-5 mr-2" />
            새 밸류에이션 시작
          </Link>
          <Link
            href="/valuation/history"
            className="inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-medium-gray-light text-medium-black font-medium rounded-lg border border-medium-gray-border transition-colors duration-200"
          >
            <History className="w-5 h-5 mr-2" />
            히스토리 보기
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {!isLoadingStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="총 밸류에이션"
            value={userStats.totalValuations}
            type="percentage"
            subtitle="완료된 평가"
          />
          <MetricCard
            title="평균 멀티플"
            value={userStats.averageMultiple}
            type="multiple"
            subtitle="전체 평균"
          />
          <MetricCard
            title="평균 등급"
            value={getGradeFromStats()}
            type="grade"
            subtitle="포트폴리오 평균"
          />
          <MetricCard
            title="이번 달 활동"
            value={userStats.recentActivity.reduce((sum, item) => sum + item.count, 0)}
            type="percentage"
            subtitle="건"
            trend={userStats.recentActivity.length > 1 ? 'up' : undefined}
          />
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="bg-white border border-medium-gray-border rounded-lg overflow-hidden">
        <div className="border-b border-medium-gray-border">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 sm:flex-initial px-6 py-4 text-body-small font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'text-medium-green border-medium-green'
                  : 'text-medium-black-secondary border-transparent hover:text-medium-black hover:border-medium-gray'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block mr-2" />
              <span className="hidden sm:inline">개요</span>
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 sm:flex-initial px-6 py-4 text-body-small font-medium border-b-2 transition-colors ${
                activeTab === 'calculator'
                  ? 'text-medium-green border-medium-green'
                  : 'text-medium-black-secondary border-transparent hover:text-medium-black hover:border-medium-gray'
              }`}
            >
              <Calculator className="w-4 h-4 inline-block mr-2" />
              <span className="hidden sm:inline">계산기</span>
            </button>
            {currentValuation && (
              <button
                onClick={() => setActiveTab('results')}
                className={`flex-1 sm:flex-initial px-6 py-4 text-body-small font-medium border-b-2 transition-colors ${
                  activeTab === 'results'
                    ? 'text-medium-green border-medium-green'
                    : 'text-medium-black-secondary border-transparent hover:text-medium-black hover:border-medium-gray'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline-block mr-2" />
                <span className="hidden sm:inline">결과</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 sm:flex-initial px-6 py-4 text-body-small font-medium border-b-2 transition-colors ${
                activeTab === 'insights'
                  ? 'text-medium-green border-medium-green'
                  : 'text-medium-black-secondary border-transparent hover:text-medium-black hover:border-medium-gray'
              }`}
            >
              <Lightbulb className="w-4 h-4 inline-block mr-2" />
              <span className="hidden sm:inline">인사이트</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-medium-gray-border rounded-lg p-6">
                  <h3 className="text-heading-4 font-serif text-medium-black mb-4">최근 밸류에이션</h3>
                  {recentValuations.length > 0 ? (
                    <div className="space-y-3">
                      {recentValuations.slice(0, 3).map((valuation) => (
                        <div key={valuation.id} className="flex justify-between items-center py-2 border-b border-medium-gray-border last:border-0">
                          <div>
                            <p className="text-body-small font-medium text-medium-black">{valuation.companyName}</p>
                            <p className="text-caption text-medium-black-tertiary">{valuation.industry}</p>
                          </div>
                          <p className="text-body-small font-medium text-medium-green">
                            {valuation.multiple.toFixed(1)}x
                          </p>
                        </div>
                      ))}
                      <Link
                        href="/valuation/history"
                        className="inline-flex items-center text-body-small text-medium-green hover:text-green-700 transition-colors mt-2"
                      >
                        전체 보기 <TrendingUp className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-body text-medium-black-secondary mb-4">
                        아직 밸류에이션을 진행하지 않았습니다.
                      </p>
                      <Link
                        href="/valuation/new"
                        className="inline-flex items-center justify-center px-4 py-2 bg-medium-green hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        첫 번째 밸류에이션 시작하기
                      </Link>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-medium-gray-border rounded-lg p-6">
                  <h3 className="text-heading-4 font-serif text-medium-black mb-4">업종별 분포</h3>
                  {Object.keys(userStats.industryBreakdown).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(userStats.industryBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([industry, count]) => (
                          <div key={industry} className="flex justify-between items-center">
                            <span className="text-body-small text-medium-black">{industry}</span>
                            <div className="flex items-center">
                              <div className="w-24 h-2 bg-medium-gray rounded-full mr-3">
                                <div 
                                  className="h-2 bg-medium-green rounded-full"
                                  style={{ width: `${(count / userStats.totalValuations) * 100}%` }}
                                />
                              </div>
                              <span className="text-body-small font-medium text-medium-black-secondary">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-body text-medium-black-secondary text-center py-8">
                      아직 데이터가 없습니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Calculator Tab */}
          {activeTab === 'calculator' && (
            <div className="max-w-4xl mx-auto">
              <ValuationForm 
                onSubmit={handleValuationSubmit}
                isLoading={isCalculating}
              />
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && currentValuation && (
            <div className="space-y-6">
              <ValuationResults
                valuation={currentValuation}
                industryBenchmark={industryBenchmark}
                companyName={companyName}
                onSave={handleSaveValuation}
                onExport={() => console.log('Export functionality')}
              />
              
              {comparables.length > 0 && (
                <ComparablesList comparables={comparables} />
              )}
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <IndustryInsights industry={selectedIndustry} />
              <div className="bg-white border border-medium-gray-border rounded-lg p-6">
                <h3 className="text-heading-4 font-serif text-medium-black mb-4">업종 선택</h3>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full px-4 py-3 border border-medium-gray-border rounded-lg text-body text-medium-black focus:outline-none focus:border-medium-green transition-colors"
                >
                  <option value="SaaS">SaaS</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Content Sites">Content Sites</option>
                  <option value="Mobile Apps">Mobile Apps</option>
                  <option value="핀테크">핀테크</option>
                  <option value="헬스케어">헬스케어</option>
                  <option value="교육">교육</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}