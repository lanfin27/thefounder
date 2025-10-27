'use client'

/**
 * YouTube Channels Admin Page
 *
 * Manual channel verification and correction interface
 * Allows admins to:
 * - View all channels with validation status
 * - Manually edit channel IDs
 * - Verify channels via YouTube API
 * - Link to YouTube to check channels
 */

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Channel {
  channel_id: string
  name: string
  category_code: string
  subscribers: number
  last_updated: string
  validation_status?: 'valid' | 'invalid' | 'unknown' | 'checking'
}

interface Category {
  code: string
  name: string
}

// Client-side Supabase client for YouTube Industry data
const getYouTubeSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('YouTube Supabase credentials not configured')
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

export default function YouTubeChannelsAdmin() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    try {
      const ytSupabase = getYouTubeSupabase()

      if (!ytSupabase) {
        console.error('YouTube Supabase client not available')
        setCategories([])
        setChannels([])
        setLoading(false)
        return
      }

      // Load categories directly from Supabase
      console.log('Loading categories from Supabase...')
      const { data: categoriesData, error: categoriesError } = await ytSupabase
        .from('youtube_categories')
        .select('code, name')
        .order('code')

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError)
        setCategories([])
      } else {
        console.log('Categories loaded:', categoriesData)
        setCategories(categoriesData || [])
      }

      // Load channels directly from Supabase
      console.log('Loading channels from Supabase...')
      const { data: channelsData, error: channelsError } = await ytSupabase
        .from('youtube_channels')
        .select('channel_id, name, category_code, subscribers, last_updated')
        .order('subscribers', { ascending: false })

      if (channelsError) {
        console.error('Error loading channels:', channelsError)
        setChannels([])
      } else {
        console.log('Channels loaded:', channelsData?.length || 0)
        setChannels(
          (channelsData || []).map((ch) => ({
            ...ch,
            validation_status: 'unknown' as const
          }))
        )
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setCategories([])
      setChannels([])
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(channelId: string) {
    setChannels(prev =>
      prev.map(ch =>
        ch.channel_id === channelId
          ? { ...ch, validation_status: 'checking' as const }
          : ch
      )
    )

    try {
      const response = await fetch('/api/youtube-industry/verify-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId })
      })

      const result = await response.json()

      setChannels(prev =>
        prev.map(ch =>
          ch.channel_id === channelId
            ? {
                ...ch,
                validation_status: result.valid ? 'valid' : 'invalid',
                name: result.valid ? result.name : ch.name,
                subscribers: result.valid ? result.subscribers : ch.subscribers
              }
            : ch
        )
      )
    } catch (error) {
      console.error('Verification failed:', error)
      setChannels(prev =>
        prev.map(ch =>
          ch.channel_id === channelId
            ? { ...ch, validation_status: 'invalid' as const }
            : ch
        )
      )
    }
  }

  async function handleUpdate(oldChannelId: string, newChannelId: string) {
    if (!newChannelId || newChannelId === oldChannelId) {
      setEditingId(null)
      return
    }

    try {
      const response = await fetch('/api/youtube-industry/update-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_channel_id: oldChannelId,
          new_channel_id: newChannelId
        })
      })

      if (response.ok) {
        await loadData()
        setEditingId(null)
        setEditValue('')
      } else {
        alert('Failed to update channel')
      }
    } catch (error) {
      console.error('Update failed:', error)
      alert('Failed to update channel')
    }
  }

  function startEdit(channelId: string) {
    setEditingId(channelId)
    setEditValue(channelId)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  const filteredChannels = (channels || []).filter(ch => {
    const matchesCategory = selectedCategory === 'all' || ch.category_code === selectedCategory
    const matchesSearch = searchQuery === '' ||
      ch.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.channel_id?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="text-xl text-gray-600 mb-4">Loading YouTube channels...</div>
              <div className="text-sm text-gray-500">Fetching data from Supabase</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error if no data loaded
  if (!loading && channels.length === 0 && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              ⚠️ No Data Available
            </h2>
            <p className="text-yellow-800 mb-4">
              Could not load YouTube channels or categories from the database.
            </p>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>Possible solutions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Check if environment variables are set in .env.local</li>
                <li>Run: <code className="bg-yellow-100 px-2 py-1 rounded">npm run yt:update-real-channels</code></li>
                <li>Verify Supabase connection and credentials</li>
              </ol>
            </div>
            <button
              onClick={() => loadData()}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YouTube Channels Admin
          </h1>
          <p className="text-gray-600">
            Verify and manage YouTube channel IDs
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Filter
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories && categories.length > 0 ? (
                  categories.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} - {cat.name}
                    </option>
                  ))
                ) : null}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or channel ID..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Channels</div>
            <div className="text-2xl font-bold text-gray-900">{channels?.length || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Valid</div>
            <div className="text-2xl font-bold text-green-600">
              {channels?.filter(ch => ch.validation_status === 'valid').length || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Invalid</div>
            <div className="text-2xl font-bold text-red-600">
              {channels?.filter(ch => ch.validation_status === 'invalid').length || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Unknown</div>
            <div className="text-2xl font-bold text-gray-600">
              {channels?.filter(ch => ch.validation_status === 'unknown').length || 0}
            </div>
          </div>
        </div>

        {/* Channels Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscribers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredChannels && filteredChannels.length > 0 ? (
                  filteredChannels.map((channel) => (
                    <tr key={channel.channel_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {channel.category_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingId === channel.channel_id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              style={{ width: '250px' }}
                            />
                            <button
                              onClick={() => handleUpdate(channel.channel_id, editValue)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {channel.channel_id}
                            </code>
                            <button
                              onClick={() => startEdit(channel.channel_id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {channel.subscribers?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {channel.validation_status === 'valid' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                            Valid
                          </span>
                        )}
                        {channel.validation_status === 'invalid' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                            Invalid
                          </span>
                        )}
                        {channel.validation_status === 'checking' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            Checking...
                          </span>
                        )}
                        {channel.validation_status === 'unknown' && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleVerify(channel.channel_id)}
                            disabled={channel.validation_status === 'checking'}
                            className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                          >
                            Verify
                          </button>
                          <a
                            href={`https://www.youtube.com/channel/${channel.channel_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            YouTube
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No channels found matching your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
