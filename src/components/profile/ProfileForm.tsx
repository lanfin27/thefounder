'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Camera } from 'lucide-react'

interface ProfileFormProps {
  user: User
  profile: any
}

export default function ProfileForm({ user, profile }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name,
        bio,
        website,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      setMessage('프로필 업데이트 중 오류가 발생했습니다.')
    } else {
      setMessage('프로필이 업데이트되었습니다.')
      router.refresh()
    }
    
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
        }`}>
          {message}
        </div>
      )}

      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-medium text-gray-600">
                {name?.[0] || user.email?.[0].toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-founder-primary text-white p-2 rounded-full hover:bg-opacity-90 transition-colors"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900">{user.email}</h3>
          <p className="text-sm text-gray-500">
            멤버십: {profile?.membership_status === 'premium' ? '프리미엄' : '무료'}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          이름
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-founder-primary focus:border-founder-primary"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          소개
        </label>
        <textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-founder-primary focus:border-founder-primary resize-none"
          placeholder="간단한 자기소개를 작성해주세요"
        />
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
          웹사이트
        </label>
        <input
          type="url"
          id="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-founder-primary focus:border-founder-primary"
          placeholder="https://example.com"
        />
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-founder-primary text-white font-medium rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-founder-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '저장 중...' : '프로필 업데이트'}
        </button>
      </div>
    </form>
  )
}