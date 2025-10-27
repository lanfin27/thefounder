'use client'

/**
 * YouTube Industry Channels Management Page
 * 채널 관리 페이지 - 클라이언트 전용 렌더링
 */

import dynamic from 'next/dynamic'

// 🔥 SSR 완전 비활성화 - 클라이언트 전용 렌더링
const ChannelManager = dynamic(
  () => import('@/components/admin/ChannelManager').then(mod => ({ default: mod.ChannelManager })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">채널 목록 로딩 중...</p>
        </div>
      </div>
    ),
  }
)

export default function ChannelsPage() {
  return <ChannelManager />
}
