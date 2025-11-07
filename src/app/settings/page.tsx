'use client'

import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SettingsTab = 'account' | 'notifications' | 'security'

export default function SettingsPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 계정 설정
  const [username, setUsername] = useState('')
  const [isEditingUsername, setIsEditingUsername] = useState(false)

  // 알림 설정
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  // 보안 설정
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
    if (user) {
      const metadata = user.user_metadata
      setUsername(metadata?.username || user.email?.split('@')[0] || '')
      setEmailNotifications(metadata?.email_notifications !== false)
      setMarketingEmails(metadata?.marketing_emails === true)
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  // 사용자 이름 저장
  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setMessage({ type: 'error', text: '사용자 이름을 입력해주세요.' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { username: username.trim() }
      })

      if (error) throw error

      setMessage({ type: 'success', text: '사용자 이름이 업데이트되었습니다.' })
      setIsEditingUsername(false)
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  // 알림 설정 저장
  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          email_notifications: emailNotifications,
          marketing_emails: marketingEmails,
        }
      })

      if (error) throw error

      setMessage({ type: 'success', text: '알림 설정이 저장되었습니다.' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  // 비밀번호 변경
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">설정</h1>

      {/* 메시지 알림 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('account')}
            className={`pb-4 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'account'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            계정
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-4 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            알림
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-4 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            보안
          </button>
        </nav>
      </div>

      {/* 계정 탭 */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* 이메일 주소 */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">이메일 주소</p>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
            </div>
            <span className="text-xs text-gray-400">변경 불가</span>
          </div>

          {/* 사용자 이름 */}
          <div className="py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">사용자 이름</p>
              {!isEditingUsername && (
                <button
                  onClick={() => setIsEditingUsername(true)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  편집
                </button>
              )}
            </div>

            {isEditingUsername ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  placeholder="@username"
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setIsEditingUsername(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">@{username}</p>
            )}
          </div>

          {/* 프로필 정보 */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">프로필 정보</p>
              <p className="text-sm text-gray-500 mt-1">
                사진, 이름, 소개 등을 편집하세요
              </p>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="text-sm text-green-600 hover:text-green-700"
            >
              편집
            </button>
          </div>
        </div>
      )}

      {/* 알림 탭 */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* 이메일 알림 */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">이메일 알림</p>
              <p className="text-sm text-gray-500 mt-1">
                새 글과 댓글에 대한 알림을 받습니다
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* 마케팅 이메일 */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">마케팅 이메일</p>
              <p className="text-sm text-gray-500 mt-1">
                새로운 기능과 이벤트에 대한 소식을 받습니다
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={marketingEmails}
                onChange={(e) => setMarketingEmails(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* 저장 버튼 */}
          <div className="pt-4">
            <button
              onClick={handleSaveNotifications}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </div>
      )}

      {/* 보안 탭 */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              비밀번호 변경
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* 새 비밀번호 */}
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="최소 6자 이상"
                />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="새 비밀번호 재입력"
                />
              </div>

              {/* 버튼 */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </div>

          {/* 계정 삭제 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              계정 삭제
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
            </p>
            <button
              onClick={() => {
                if (confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                  alert('계정 삭제 기능은 추후 구현될 예정입니다.')
                }
              }}
              className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              계정 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
