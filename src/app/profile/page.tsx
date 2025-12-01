'use client'

import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import EditProfileModal from '@/components/profile/EditProfileModal'
import { MapPin, Link as LinkIcon, Calendar } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userMetadata = user.user_metadata
  const userName = userMetadata?.name || userMetadata?.full_name || user.email?.split('@')[0] || '사용자'
  const userEmail = user.email || ''
  const userAvatar = userMetadata?.avatar_url || userMetadata?.picture || null
  const userBio = userMetadata?.bio || ''
  const userWebsite = userMetadata?.website || ''
  const userLocation = userMetadata?.location || ''
  const joinedDate = new Date(user.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long'
  })

  const handleEditSuccess = () => {
    setRefreshKey(prev => prev + 1)
    router.refresh()
  }

  return (
    <div key={refreshKey} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 프로필 헤더 */}
      <div className="text-center mb-12">
        {/* 프로필 이미지 */}
        <div className="inline-block relative mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-5xl font-bold">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* 사용자 정보 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {userName}
        </h1>
        <p className="text-gray-600 mb-4">{userEmail}</p>

        {/* 소개 */}
        {userBio && (
          <p className="text-gray-700 mb-4 max-w-2xl mx-auto">
            {userBio}
          </p>
        )}

        {/* 추가 정보 */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-6">
          {userLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{userLocation}</span>
            </div>
          )}
          {userWebsite && (
            <a
              href={userWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:text-green-700"
            >
              <LinkIcon className="w-4 h-4" />
              <span>웹사이트</span>
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{joinedDate} 가입</span>
          </div>
        </div>

        {/* 프로필 편집 버튼 */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-6 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          프로필 편집
        </button>
      </div>

      {/* 홈 탭 헤더 */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          <div className="pb-4 border-b-2 border-green-600 text-sm font-medium text-green-600">
            홈
          </div>
        </nav>
      </div>

      {/* 소개 내용 */}
      <div className="prose max-w-none">
        {userBio ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">소개</h2>
            <p className="text-gray-700 leading-relaxed">{userBio}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>아직 소개가 작성되지 않았습니다.</p>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="mt-4 px-6 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              프로필 편집하기
            </button>
          </div>
        )}
      </div>

      {/* 프로필 편집 모달 */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}