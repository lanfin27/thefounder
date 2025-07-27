'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { getClientNotionConfig } from '@/lib/notion/config'

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    count?: number
    error?: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [adminToken, setAdminToken] = useState<string>('')
  const [notionConfig, setNotionConfig] = useState<ReturnType<typeof getClientNotionConfig>>({
    databaseId: '********',
    hasToken: false,
  })
  const router = useRouter()
  
  useEffect(() => {
    setMounted(true)
    // Access environment variables only on client side
    if (typeof window !== 'undefined') {
      setAdminToken(process.env.NEXT_PUBLIC_ADMIN_TOKEN || '')
      setNotionConfig(getClientNotionConfig())
    }
  }, [])
  
  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult({
          success: true,
          count: data.count,
        })
      } else {
        setResult({
          success: false,
          error: data.error || 'Sync failed',
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error',
      })
    } finally {
      setSyncing(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Notion 콘텐츠 동기화
              </h1>
              <p className="text-gray-600 mb-8">
                Notion 데이터베이스의 콘텐츠를 블로그로 가져옵니다.
              </p>
              
              <button
                onClick={handleSync}
                disabled={syncing || !mounted || !adminToken}
                className="inline-flex items-center px-6 py-3 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-founder-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? '동기화 중...' : '동기화 시작'}
              </button>
              
              {mounted && !adminToken && (
                <p className="mt-4 text-sm text-red-600">
                  관리자 토큰이 설정되지 않았습니다.
                </p>
              )}
              
              {result && (
                <div className="mt-8">
                  {result.success ? (
                    <div className="flex items-center justify-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>{result.count}개의 포스트가 동기화되었습니다.</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-red-600">
                      <XCircle className="w-5 h-5 mr-2" />
                      <span>오류: {result.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                동기화 설정
              </h2>
              {!mounted ? (
                <div className="text-sm text-gray-500">로딩 중...</div>
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Notion 데이터베이스 ID: {notionConfig.databaseId}</li>
                  <li>• Notion API 토큰: {notionConfig.hasToken ? '설정됨' : '설정되지 않음'}</li>
                  <li>• 상태가 "발행"인 포스트만 가져옵니다</li>
                  <li>• 카테고리: 뉴스레터, SaaS, 블로그, 창업</li>
                  <li>• 프리미엄 콘텐츠는 자동으로 표시됩니다</li>
                </ul>
              )}
            </div>
            
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => router.push('/posts')}
                className="text-founder-primary hover:underline text-sm font-medium"
              >
                블로그 포스트 보기 →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}