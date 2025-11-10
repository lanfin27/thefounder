'use client'

/**
 * Delete User Modal Component
 * 사용자 삭제 확인 모달
 */

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Shield } from 'lucide-react'
import type { UserProfile } from '@/types/user'

interface DeleteUserModalProps {
  user: UserProfile
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteUserModal({ user, isOpen, onClose, onSuccess }: DeleteUserModalProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user.role === 'admin'
  const confirmationText = `${user.email}을 삭제합니다`

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAdminPassword('')
      setConfirmText('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate confirmation text
    if (confirmText !== confirmationText) {
      setError('확인 문구가 일치하지 않습니다')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          adminPassword: isAdmin ? adminPassword : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Success
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error deleting user:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                사용자 삭제
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Warning Message */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  이 작업은 되돌릴 수 없습니다!
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  다음 사용자를 영구적으로 삭제하시겠습니까?
                </p>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">이름</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name || 'Unnamed User'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">이메일</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">권한</span>
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <Shield className="w-3 h-3" />
                      관리자
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      일반 사용자
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Password (only for admin users) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    관리자 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="관리자 계정 삭제를 위해 관리자 비밀번호를 입력하세요"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    보안을 위해 관리자 계정 삭제 시 관리자 비밀번호가 필요합니다
                  </p>
                </div>
              )}

              {/* Confirmation Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  삭제 확인 <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  계속하려면 다음 텍스트를 정확히 입력하세요:
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 mb-2">
                  <code className="text-sm text-gray-900 dark:text-white">
                    {confirmationText}
                  </code>
                </div>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="위의 텍스트를 입력하세요"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  confirmText !== confirmationText ||
                  (isAdmin && !adminPassword)
                }
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '삭제 중...' : '영구 삭제'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
