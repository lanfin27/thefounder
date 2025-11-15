'use client';

import { useState, useEffect } from 'react';
import { Mail, Users, UserCheck, UserX, Search, Download } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_member: boolean;
  member_since: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  members: number;
  nonMembers: number;
}

export default function NewsletterManagementPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, members: 0, nonMembers: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    updated: number;
    alreadyCorrect: number;
    total: number;
    updates?: Array<{email: string; from: string; to: string}>;
  } | null>(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Fetch subscribers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      console.log('[Admin Page] 📥 Fetching subscribers...');

      const response = await fetch('/api/admin/newsletter/subscribers', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('[Admin Page] 📡 Response status:', response.status);

      const data = await response.json();

      if (!response.ok) {
        console.error('[Admin Page] ❌ Error response:', data);

        // Save debug info if available
        if (data.debug) {
          setDebugInfo(data.debug);
        }

        throw new Error(data.error || '구독자 목록을 가져오는데 실패했습니다.');
      }

      console.log('[Admin Page] ✅ Received data:', data);

      setSubscribers(data.subscribers || []);
      setFilteredSubscribers(data.subscribers || []);
      setStats(data.stats || { total: 0, members: 0, nonMembers: 0 });
    } catch (err) {
      console.error('[Admin Page] ❌ Fetch error:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Sync newsletter member status
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleSync = async () => {
    if (isSyncing) return;

    if (!confirm('모든 뉴스레터 구독자의 회원 상태를 동기화하시겠습니까?')) {
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      console.log('[Admin Page] 🔄 Starting newsletter sync...');

      const response = await fetch('/api/admin/newsletter/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Admin Page] ❌ Sync failed:', data);
        alert(`동기화 실패: ${data.error || '알 수 없는 오류'}`);
        return;
      }

      console.log('[Admin Page] ✅ Sync completed:', data);
      setSyncResult(data);

      // Refresh subscriber list
      await fetchSubscribers();

      alert(data.message || '동기화가 완료되었습니다.');
    } catch (error) {
      console.error('[Admin Page] ❌ Sync error:', error);
      alert('동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Search filtering
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubscribers(subscribers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = subscribers.filter((sub) =>
      sub.email.toLowerCase().includes(query)
    );
    setFilteredSubscribers(filtered);
  }, [searchQuery, subscribers]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CSV Export
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleExportCSV = () => {
    if (filteredSubscribers.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    // CSV header
    const headers = ['이메일', '구독 날짜', '멤버 여부', '가입 날짜'];

    // CSV rows
    const rows = filteredSubscribers.map((sub) => [
      sub.email,
      new Date(sub.subscribed_at).toLocaleString('ko-KR'),
      sub.is_member ? '멤버' : '비멤버',
      sub.member_since ? new Date(sub.member_since).toLocaleString('ko-KR') : '-',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Add UTF-8 BOM for Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Format date
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">뉴스레터 구독 관리</h1>
        <p className="text-gray-600">구독자 목록 및 통계를 관리합니다</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">전체 구독자</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">멤버 구독자</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.members.toLocaleString()}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-600">비멤버 구독자</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.nonMembers.toLocaleString()}</p>
        </div>
      </div>

      {/* Search and Export */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이메일로 검색..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="구독자의 회원 상태를 실제 가입 정보와 동기화합니다"
          >
            <Users className="w-4 h-4" />
            {isSyncing ? '동기화 중...' : '🔄 회원 상태 동기화'}
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredSubscribers.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-2">동기화 완료</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">업데이트됨</p>
                  <p className="text-2xl font-bold text-green-900">{syncResult.updated}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">이미 정확함</p>
                  <p className="text-2xl font-bold text-green-900">{syncResult.alreadyCorrect}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">전체</p>
                  <p className="text-2xl font-bold text-green-900">{syncResult.total}</p>
                </div>
              </div>

              {/* Show updates if any */}
              {syncResult.updates && syncResult.updates.length > 0 && (
                <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
                  <p className="font-bold text-green-900 mb-3">📝 업데이트된 구독자:</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {syncResult.updates.map((update, idx) => (
                      <div key={idx} className="text-sm text-green-800 flex items-center gap-2">
                        <span className="font-mono bg-green-100 px-2 py-1 rounded">{update.email}</span>
                        <span>→</span>
                        <span className="font-semibold">{update.from}</span>
                        <span>→</span>
                        <span className="font-semibold text-green-700">{update.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSyncResult(null)}
                className="mt-4 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">오류 발생</h3>
              <p className="text-red-800 mb-4">{error}</p>

              {/* Debug Information */}
              {debugInfo && (
                <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-300">
                  <p className="font-bold text-red-900 mb-2">🔍 디버그 정보:</p>
                  <div className="text-sm font-mono text-red-800 space-y-1">
                    {debugInfo.userId && <p>User ID: {debugInfo.userId}</p>}
                    {debugInfo.email && <p>Email: {debugInfo.email}</p>}
                    {debugInfo.roleFound && <p>Role Found: {debugInfo.roleFound}</p>}
                    {debugInfo.roleError && <p>Role Error: {debugInfo.roleError}</p>}
                    {debugInfo.suggestion && <p className="mt-2 text-red-900 font-semibold">{debugInfo.suggestion}</p>}
                  </div>
                </div>
              )}

              {/* Solution Guide */}
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-bold text-yellow-900 mb-3">💡 해결 방법:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                  <li>Supabase Dashboard로 이동</li>
                  <li>SQL Editor를 열어주세요</li>
                  <li>아래 SQL을 실행하세요:</li>
                </ol>
                <div className="mt-3 p-3 bg-gray-900 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-green-400 whitespace-pre">
{`-- user_roles 테이블에 admin 역할 추가
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = '${debugInfo?.email || 'bitmaker020@gmail.com'}'
ON CONFLICT (user_id, role) DO NOTHING;

-- 확인
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin';`}
                  </pre>
                </div>
                <p className="mt-3 text-xs text-yellow-700">
                  또는 migration 파일을 실행하세요: <code className="bg-yellow-100 px-2 py-1 rounded">supabase/migrations/20251112_add_admin_role.sql</code>
                </p>
              </div>

              {/* Retry Button */}
              <button
                onClick={fetchSubscribers}
                className="mt-4 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">구독자 목록을 불러오는 중...</p>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">구독자가 없습니다</h3>
            <p className="text-gray-600">
              {searchQuery ? '검색 결과가 없습니다.' : '아직 구독자가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    구독 날짜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    멤버 여부
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입 날짜
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{subscriber.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(subscriber.subscribed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscriber.is_member ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <UserCheck className="w-3 h-3" />
                          멤버
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          <UserX className="w-3 h-3" />
                          비멤버
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(subscriber.member_since)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {!loading && filteredSubscribers.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          총 {filteredSubscribers.length.toLocaleString()}명의 구독자
          {searchQuery && ` (${subscribers.length.toLocaleString()}명 중 검색)`}
        </div>
      )}
    </div>
  );
}
