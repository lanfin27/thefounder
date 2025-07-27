'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LoginButtonProps {
  provider: 'google' | 'kakao'
  redirectTo?: string
}

export default function LoginButton({ provider, redirectTo = '/' }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${redirectTo}`,
      },
    })

    if (error) {
      console.error('Error:', error)
      setIsLoading(false)
    }
  }

  const providerConfig = {
    google: {
      name: 'Google',
      bgColor: 'bg-white hover:bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
    },
    kakao: {
      name: '카카오',
      bgColor: 'bg-[#FEE500] hover:bg-[#FDD835]',
      textColor: 'text-[#000000D8]',
      borderColor: 'border-[#FEE500]',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#000000"
            d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.543l-1.514-2.155zm-7.236 1.383h.658v1.044a.471.471 0 1 0 .943 0V13.443h.658a.472.472 0 0 0 0-.943h-.658v-.268a.472.472 0 0 0-.943 0v.268h-.658a.472.472 0 0 0 0 .943zm-5.656-1.495v3.498a.472.472 0 0 0 .944 0V13.326l2.18 2.154a.472.472 0 0 0 .67-.662l-2.253-2.253a1.494 1.494 0 0 0-.467-.273.462.462 0 0 0-.558.149.462.462 0 0 0-.118.464.428.428 0 0 0 .056.147c.02.037.043.073.068.106l-.47-.47a.472.472 0 0 0-.668.667l.616.615z"
          />
        </svg>
      ),
    },
  }

  const config = providerConfig[provider]

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border ${config.borderColor} ${config.bgColor} ${config.textColor} font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {config.icon}
      <span>{config.name}로 로그인</span>
    </button>
  )
}