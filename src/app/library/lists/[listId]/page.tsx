import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getListItems } from '@/lib/supabase/queries/lists'
import ListDetailClient from '@/components/library/ListDetailClient'
import type { List } from '@/types/library'

// ✅ This is a SERVER COMPONENT (no 'use client')
export default async function ListDetailPage({
  params
}: {
  params: { listId: string }
}) {
  const listId = params.listId

  console.log('🔍 [ListDetailPage] Loading list:', listId)

  // Fetch data on server
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('❌ [ListDetailPage] No user authenticated, redirecting to login')
    redirect('/login')
  }

  console.log('👤 [ListDetailPage] User authenticated:', user.id)

  // Get list data
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (listError || !list) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">리스트를 찾을 수 없습니다</p>
          <a
            href="/library/lists"
            className="mt-4 text-green-600 hover:text-green-700 inline-block"
          >
            리스트로 돌아가기 →
          </a>
        </div>
      </div>
    )
  }

  // Debug: Check raw database first
  const { data: rawItems, error: rawError } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)

  console.log('📝 [ListDetailPage] Raw database check:', {
    itemCount: rawItems?.length || 0,
    hasError: !!rawError,
    sampleIds: rawItems?.slice(0, 3).map(i => i.post_id) || []
  })

  // Get list items (posts will be fetched server-side)
  let items = []
  try {
    console.log('🔍 [ListDetailPage] Calling getListItems with authenticated client...')
    items = await getListItems(listId, supabase)
    console.log('✅ [ListDetailPage] getListItems returned:', items.length, 'items')
    console.log('📊 [ListDetailPage] Items with posts:', items.filter(i => i.post).length)
  } catch (error) {
    console.error('❌ [ListDetailPage] getListItems failed:', error)
  }

  // Pass data to client component
  return (
    <ListDetailClient
      initialList={list as List}
      initialItems={items}
      listId={listId}
    />
  )
}
