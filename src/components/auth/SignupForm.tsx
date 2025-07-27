'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LoginButton from './LoginButton'
import { Mail, Lock, User } from 'lucide-react'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            name,
            email,
          },
        ])

      if (!profileError) {
        router.push('/auth/verify-email')
      } else {
        setError('프로필 생성 중 오류가 발생했습니다.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <LoginButton provider="google" />
        <LoginButton provider="kakao" />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 text-gray-500">또는 이메일로</span>
        </div>
      </div>

      <form onSubmit={handleEmailSignup} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="sr-only">
            이름
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-founder-primary focus:border-founder-primary focus:z-10 sm:text-sm"
              placeholder="이름"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            이메일
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-founder-primary focus:border-founder-primary focus:z-10 sm:text-sm"
              placeholder="이메일 주소"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            비밀번호
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-founder-primary focus:border-founder-primary focus:z-10 sm:text-sm"
              placeholder="비밀번호 (8자 이상)"
            />
          </div>
        </div>

        <div className="text-xs text-gray-600">
          회원가입을 하면 The Founder의{' '}
          <a href="/terms" className="text-founder-primary hover:underline">
            이용약관
          </a>
          과{' '}
          <a href="/privacy" className="text-founder-primary hover:underline">
            개인정보처리방침
          </a>
          에 동의하는 것으로 간주합니다.
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-founder-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-founder-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
    </div>
  )
}