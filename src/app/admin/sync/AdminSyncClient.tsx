'use client'

import { useState, useEffect } from 'react'
import type { NotionSource } from '@/types/notionSource'

// Sync History Interface
interface SyncHistory {
  id: string
  timestamp: Date
  sourceName: string
  sourceId: string
  postsCount: number
  succeeded: number
  failed: number
  posts: any[]
}

export default function AdminSyncClient() {
  // ===== STATE MANAGEMENT =====
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [sources, setSources] = useState<NotionSource[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  // Add form state
  const [formData, setFormData] = useState({
    name: '',
    notion_token: '',
    notion_database_id: ''
  })
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  // Sync results
  const [syncResults, setSyncResults] = useState<any>(null)

  // Post details table
  const [syncedPosts, setSyncedPosts] = useState<any[]>([])
  const [showPostsTable, setShowPostsTable] = useState(false)

  // ===== NEW: Source Edit/View State =====
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [editingSources, setEditingSources] = useState<Record<string, {
    name: string
    token: string
    databaseId: string
  }>>({})
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})

  // ===== NEW: Sync History State =====
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // ===== LIFECYCLE =====
  useEffect(() => {
    loadSources()
    loadSyncHistory()
  }, [])

  // ===== SYNC HISTORY FUNCTIONS =====

  const loadSyncHistory = () => {
    try {
      const saved = localStorage.getItem('notion-sync-history')
      console.log('[SyncHistory] Loading from localStorage:', saved)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert timestamp strings back to Date objects
        const history = parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        }))
        console.log('[SyncHistory] Loaded history:', history.length, 'entries')
        setSyncHistory(history)
      } else {
        console.log('[SyncHistory] No saved history found')
      }
    } catch (error) {
      console.error('[SyncHistory] Failed to load sync history:', error)
    }
  }

  const saveSyncHistory = (history: SyncHistory[]) => {
    try {
      // Keep only last 50 entries
      const limited = history.slice(0, 50)
      const json = JSON.stringify(limited)
      localStorage.setItem('notion-sync-history', json)
      console.log('[SyncHistory] Saved to localStorage:', limited.length, 'entries')
      setSyncHistory(limited)
    } catch (error) {
      console.error('[SyncHistory] Failed to save sync history:', error)
    }
  }

  const addToHistory = (entry: Omit<SyncHistory, 'id' | 'timestamp'>) => {
    const newEntry: SyncHistory = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    console.log('[SyncHistory] Adding new entry:', newEntry)
    const newHistory = [newEntry, ...syncHistory]
    saveSyncHistory(newHistory)
  }

  const deleteHistoryEntry = (id: string) => {
    const newHistory = syncHistory.filter(h => h.id !== id)
    saveSyncHistory(newHistory)
  }

  const clearAllHistory = () => {
    if (confirm('모든 동기화 내역을 삭제하시겠습니까?')) {
      saveSyncHistory([])
    }
  }

  // ===== API HANDLERS =====

  const loadSources = async () => {
    try {
      const res = await fetch('/api/admin/notion-sources')
      const data = await res.json()
      setSources(data)
    } catch (error) {
      console.error('Failed to load sources:', error)
      alert('소스 로딩 실패')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentPosts = async () => {
    try {
      const res = await fetch('/api/posts')
      if (res.ok) {
        const data = await res.json()
        setSyncedPosts(data)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  }

  const handleTestConnection = async () => {
    if (!formData.notion_token || !formData.notion_database_id) {
      alert('Token과 Database ID를 입력하세요')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/admin/notion-sources/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notion_token: formData.notion_token,
          notion_database_id: formData.notion_database_id
        })
      })

      const data = await res.json()
      setTestResult(data)
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message
      })
    } finally {
      setTesting(false)
    }
  }

  const handleAddSource = async () => {
    if (!formData.name || !formData.notion_token || !formData.notion_database_id) {
      alert('모든 필드를 입력하세요')
      return
    }

    if (!testResult || !testResult.success) {
      alert('먼저 연결 테스트를 성공해야 합니다')
      return
    }

    try {
      const res = await fetch('/api/admin/notion-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        alert('소스가 추가되었습니다')
        setShowAddForm(false)
        setFormData({ name: '', notion_token: '', notion_database_id: '' })
        setTestResult(null)
        loadSources()
      } else {
        const error = await res.json()
        alert('추가 실패: ' + error.error)
      }
    } catch (error: any) {
      alert('추가 실패: ' + error.message)
    }
  }

  const handleDeleteSource = async (id: string, name: string) => {
    if (!confirm(`"${name}" 소스를 삭제하시겠습니까?\n\n이미 동기화된 포스트는 유지됩니다.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/notion-sources/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('삭제되었습니다')
        loadSources()
      } else {
        alert('삭제 실패')
      }
    } catch (error) {
      alert('삭제 실패')
    }
  }

  const handleSyncSource = async (sourceId: string, sourceName: string) => {
    console.log(`\n🎯 [UI] ═══════════ INDIVIDUAL SYNC MODE ═══════════`)
    console.log(`[UI] 🎯 Individual sync requested for: "${sourceName}"`)
    console.log(`[UI] 📡 Source ID: ${sourceId}`)
    console.log(`[UI] ✅ Mode: INDIVIDUAL (syncing ONLY this source)`)
    console.log(`════════════════════════════════════════════════════\n`)

    setSyncing(sourceId)
    setSyncResults(null)
    setSyncedPosts([])

    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      })

      const result = await res.json()
      console.log(`[UI] ✅ Received sync result for "${sourceName}":`, result)

      setSyncResults(result)

      if (result.results[0].success) {
        // Fetch posts after successful sync
        await fetchRecentPosts()
        const posts = await fetch('/api/posts').then(r => r.json()).catch(() => [])
        setShowPostsTable(true)

        // Add to history with fetched posts
        addToHistory({
          sourceName,
          sourceId,
          postsCount: result.results[0].postsCount,
          succeeded: 1,
          failed: 0,
          posts: posts || []
        })

        alert(
          `✓ ${sourceName}\n\n` +
          `동기화 성공: ${result.results[0].postsCount}개 포스트\n` +
          `소요 시간: ${result.results[0].duration}ms`
        )
        loadSources()
      } else {
        alert(`✗ ${sourceName}\n\n실패: ${result.results[0].error}`)
      }
    } catch (error: any) {
      alert('동기화 실패: ' + error.message)
    } finally {
      setSyncing(null)
    }
  }

  const handleSyncAll = async () => {
    if (sources.length === 0) {
      alert('동기화할 소스가 없습니다')
      return
    }

    console.log(`\n🌐 [UI] ═══════════ BULK SYNC MODE ═══════════`)
    console.log(`[UI] 🌐 Bulk sync requested for ALL sources`)
    console.log(`[UI] 📊 Total sources to sync: ${sources.length}`)
    console.log(`[UI] 📋 Sources:`, sources.map(s => s.name).join(', '))
    console.log(`[UI] ✅ Mode: BULK (syncing ALL active sources)`)
    console.log(`════════════════════════════════════════════════════\n`)

    setSyncing('all')
    setSyncResults(null)
    setSyncedPosts([])

    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: true })
      })

      const result = await res.json()
      console.log(`[UI] ✅ Received bulk sync result:`, result)

      setSyncResults(result)

      // Fetch posts after successful sync
      await fetchRecentPosts()
      const posts = await fetch('/api/posts').then(r => r.json()).catch(() => [])
      setShowPostsTable(true)

      // Add to history with fetched posts
      addToHistory({
        sourceName: `전체 (${sources.length}개 소스)`,
        sourceId: 'all',
        postsCount: result.totalPosts,
        succeeded: result.successCount,
        failed: result.failureCount,
        posts: posts || []
      })

      alert(
        `전체 동기화 완료!\n\n` +
        `총 포스트: ${result.totalPosts}개\n` +
        `성공: ${result.successCount}개\n` +
        `실패: ${result.failureCount}개`
      )

      loadSources()
    } catch (error: any) {
      alert('전체 동기화 실패: ' + error.message)
    } finally {
      setSyncing(null)
    }
  }

  // ===== NEW: Source Edit Functions =====

  const handleToggleSourceDetails = (sourceId: string, source: NotionSource) => {
    if (expandedSourceId === sourceId) {
      setExpandedSourceId(null)
    } else {
      setExpandedSourceId(sourceId)
      // Initialize editing state
      setEditingSources({
        ...editingSources,
        [sourceId]: {
          name: source.name,
          token: source.notion_token,
          databaseId: source.notion_database_id
        }
      })
    }
  }

  const handleSaveSource = async (sourceId: string) => {
    const editData = editingSources[sourceId]
    if (!editData) return

    try {
      const res = await fetch(`/api/admin/notion-sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          notion_token: editData.token,
          notion_database_id: editData.databaseId
        })
      })

      if (res.ok) {
        alert('저장되었습니다')
        setExpandedSourceId(null)
        loadSources()
      } else {
        const error = await res.json()
        alert('저장 실패: ' + error.error)
      }
    } catch (error: any) {
      alert('저장 실패: ' + error.message)
    }
  }

  const handleCancelEdit = (sourceId: string) => {
    setExpandedSourceId(null)
    const newEditing = { ...editingSources }
    delete newEditing[sourceId]
    setEditingSources(newEditing)
  }

  const toggleTokenVisibility = (sourceId: string) => {
    setShowTokens({
      ...showTokens,
      [sourceId]: !showTokens[sourceId]
    })
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(`${label} 복사됨!`)
    } catch (error) {
      alert('복사 실패')
    }
  }

  const maskToken = (token: string) => {
    if (token.length <= 4) return token
    return token.substring(0, 4) + '•'.repeat(Math.min(token.length - 4, 30))
  }

  // ===== RENDER =====

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ===== HEADER SECTION ===== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                노션 동기화 관리
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                여러 노션 데이터베이스를 관리하고 동기화하세요
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {showAddForm ? '취소' : '+ 소스 추가'}
              </button>
              {sources.length > 0 && (
                <button
                  onClick={handleSyncAll}
                  disabled={syncing !== null}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {syncing === 'all' ? '동기화 중...' : '전체 동기화'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== ADD SOURCE FORM ===== */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              새 노션 소스 추가
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  소스 이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 메인 블로그"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notion Token
                </label>
                <input
                  type="password"
                  value={formData.notion_token}
                  onChange={(e) => setFormData({ ...formData, notion_token: e.target.value })}
                  placeholder="secret_xxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notion Database ID
                </label>
                <input
                  type="text"
                  value={formData.notion_database_id}
                  onChange={(e) => setFormData({ ...formData, notion_database_id: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:bg-gray-400"
              >
                {testing ? '테스트 중...' : '연결 테스트'}
              </button>

              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? '✓' : '✗'} {testResult.message}
                  </p>
                  {testResult.databaseTitle && (
                    <p className="text-sm text-green-700 mt-1">
                      데이터베이스: {testResult.databaseTitle}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleAddSource}
                disabled={!testResult || !testResult.success}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                소스 추가
              </button>
            </div>
          </div>
        )}

        {/* ===== SOURCES LIST ===== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            노션 소스 목록
          </h2>

          {sources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-base font-medium">등록된 노션 소스가 없습니다</p>
              <p className="text-sm mt-2">위의 "+ 소스 추가" 버튼을 클릭하여 첫 소스를 추가하세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {source.name}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Database ID:</span>{' '}
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {source.notion_database_id.substring(0, 8)}...
                          </code>
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">마지막 동기화:</span>{' '}
                          {source.last_synced_at
                            ? new Date(source.last_synced_at).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '없음'
                          }
                        </p>
                        {source.sync_count > 0 && (
                          <p className="text-xs text-gray-500">
                            총 {source.sync_count}회 동기화됨
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleToggleSourceDetails(source.id, source)}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        {expandedSourceId === source.id ? '숨기기' : '상세보기'}
                      </button>
                      <button
                        onClick={() => handleSyncSource(source.id, source.name)}
                        disabled={syncing !== null}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
                      >
                        {syncing === source.id ? '동기화 중...' : '동기화'}
                      </button>
                      <button
                        onClick={() => handleDeleteSource(source.id, source.name)}
                        disabled={syncing !== null}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* ===== EXPANDED SOURCE EDIT FORM ===== */}
                  {expandedSourceId === source.id && editingSources[source.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-3">📝 소스 정보</h4>

                      <div className="space-y-4">
                        {/* Source Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            소스 이름
                          </label>
                          <input
                            type="text"
                            value={editingSources[source.id].name}
                            onChange={(e) => setEditingSources({
                              ...editingSources,
                              [source.id]: { ...editingSources[source.id], name: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Notion Token */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notion Token
                          </label>
                          <input
                            type={showTokens[source.id] ? "text" : "password"}
                            value={editingSources[source.id].token}
                            onChange={(e) => setEditingSources({
                              ...editingSources,
                              [source.id]: { ...editingSources[source.id], token: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => toggleTokenVisibility(source.id)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              👁️ {showTokens[source.id] ? '숨기기' : '표시'}
                            </button>
                            <button
                              onClick={() => copyToClipboard(editingSources[source.id].token, 'Token')}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              📋 복사
                            </button>
                          </div>
                        </div>

                        {/* Database ID */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Database ID
                          </label>
                          <input
                            type="text"
                            value={editingSources[source.id].databaseId}
                            onChange={(e) => setEditingSources({
                              ...editingSources,
                              [source.id]: { ...editingSources[source.id], databaseId: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => copyToClipboard(editingSources[source.id].databaseId, 'Database ID')}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              📋 복사
                            </button>
                          </div>
                        </div>

                        {/* Save/Cancel Buttons */}
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleSaveSource(source.id)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            💾 저장
                          </button>
                          <button
                            onClick={() => handleCancelEdit(source.id)}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                          >
                            ❌ 취소
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== SYNC RESULTS ===== */}
        {syncResults && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              동기화 결과
            </h2>
            <div className="space-y-2">
              {/* 주요 결과 */}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">동기화된 포스트:</span>
                <span className="font-semibold text-blue-600 text-xl">
                  {syncResults.totalPosts}개
                </span>
              </div>

              {/* 소스 정보 */}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">동기화 소스:</span>
                <span className="font-semibold text-gray-900">
                  {syncResults.successCount}개 성공
                  {syncResults.failureCount > 0 && `, ${syncResults.failureCount}개 실패`}
                </span>
              </div>

              {/* 상세 내역 */}
              {syncResults.results && syncResults.results.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">상세 내역</h3>
                  <div className="space-y-1">
                    {syncResults.results.map((result: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">{result.sourceName}</span>
                        <span className={result.success ? 'text-green-600 font-medium' : 'text-red-600'}>
                          {result.success
                            ? `✓ ${result.postsCount}개 포스트`
                            : `✗ ${result.error}`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== SYNCED POSTS TABLE ===== */}
        {showPostsTable && syncedPosts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                동기화된 포스트 ({syncedPosts.length}개)
              </h2>
              <button
                onClick={() => setShowPostsTable(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                숨기기
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제목
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      태그
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {syncedPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {post.title}
                            </div>
                            {post.slug && (
                              <div className="text-xs text-gray-500 mt-1">
                                /{post.slug}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.categoryLabel || post.category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {post.publishedDate
                          ? new Date(post.publishedDate).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })
                          : '-'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status === 'published' ? '발행' : post.status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(post.tags || []).slice(0, 3).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {tag}
                            </span>
                          ))}
                          {(post.tags || []).length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== NEW: SYNC HISTORY SECTION ===== */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              📜 동기화 내역 {syncHistory.length > 0 && `(${syncHistory.length}개)`}
            </h2>
            {syncHistory.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                전체 내역 삭제
              </button>
            )}
          </div>

          {syncHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base font-medium">아직 동기화 내역이 없습니다</p>
              <p className="text-sm mt-2">노션 소스를 동기화하면 여기에 기록됩니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {entry.timestamp.toLocaleString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="font-medium text-gray-900">
                          {entry.sourceName}
                        </span>
                        <span className="text-green-600 font-medium">
                          ✅ {entry.postsCount}개 동기화
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setExpandedHistoryId(
                          expandedHistoryId === entry.id ? null : entry.id
                        )}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        📊 {expandedHistoryId === entry.id ? '숨기기' : '상세보기'}
                      </button>
                      <button
                        onClick={() => deleteHistoryEntry(entry.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>

                  {/* Expanded History Details */}
                  {expandedHistoryId === entry.id && entry.posts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        동기화된 포스트 ({entry.posts.length}개)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                제목
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                카테고리
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                날짜
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                상태
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                태그
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {entry.posts.map((post: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {post.title}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                    {post.categoryLabel || post.category || '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {post.publishedDate
                                    ? new Date(post.publishedDate).toLocaleDateString('ko-KR')
                                    : '-'
                                  }
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                    {post.status === 'published' ? '발행' : post.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {(post.tags || []).slice(0, 2).map((tag: string, tagIdx: number) => (
                                      <span
                                        key={tagIdx}
                                        className="inline-flex px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {(post.tags || []).length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{post.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== USAGE INSTRUCTIONS ===== */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">사용 방법</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>• 소스 추가:</strong> 노션 API Token과 Database ID를 입력하여 새 소스를 추가하세요</p>
            <p><strong>• 연결 테스트:</strong> 추가하기 전에 연결을 테스트하여 유효성을 확인하세요</p>
            <p><strong>• 소스 관리:</strong> "상세보기"를 클릭하여 Token과 Database ID를 조회/수정할 수 있습니다</p>
            <p><strong>• 개별 동기화:</strong> 각 소스별로 개별적으로 동기화할 수 있습니다</p>
            <p><strong>• 전체 동기화:</strong> 모든 활성 소스를 한 번에 동기화할 수 있습니다</p>
            <p><strong>• 동기화 내역:</strong> 과거 동기화 기록은 자동으로 저장되며 최대 50개까지 보관됩니다</p>
          </div>
        </div>

      </div>
    </div>
  )
}
