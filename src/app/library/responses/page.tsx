'use client'

import { useEffect, useState } from 'react'
import { getUserResponses } from '@/lib/supabase/queries/responses'
import ResponseItem from '@/components/library/ResponseItem'
import type { UserResponse } from '@/types/library'

export default function ResponsesPage() {
  const [responses, setResponses] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResponses()
  }, [])

  async function loadResponses() {
    try {
      setLoading(true)
      const data = await getUserResponses()
      setResponses(data)
    } catch (error) {
      console.error('Failed to load responses:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {responses.length > 0 ? (
        <div className="space-y-6">
          {responses.map(response => (
            <ResponseItem
              key={response.id}
              response={response}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">
            아직 작성한 댓글이 없습니다.
          </p>
          <p className="text-sm text-gray-400">
            글에 댓글을 남기면 여기에 표시됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
