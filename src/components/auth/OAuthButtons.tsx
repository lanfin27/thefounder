'use client'

import { useState } from 'react'
import { signInWithOAuth, getOAuthProviderInfo, type OAuthProvider } from '@/lib/auth/oauth'

interface OAuthButtonsProps {
  redirectTo?: string
  className?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function OAuthButtons({ 
  redirectTo = '/dashboard',
  className = '',
  onSuccess,
  onError
}: OAuthButtonsProps) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null)

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    try {
      setLoading(provider)
      const { error } = await signInWithOAuth({ provider, redirectTo })
      
      if (error) {
        throw error
      }
      
      onSuccess?.()
    } catch (error) {
      console.error(`${provider} sign in error:`, error)
      onError?.(error as Error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <OAuthButton
        provider="google"
        onClick={() => handleOAuthSignIn('google')}
        loading={loading === 'google'}
        disabled={loading !== null}
      />
      <OAuthButton
        provider="kakao"
        onClick={() => handleOAuthSignIn('kakao')}
        loading={loading === 'kakao'}
        disabled={loading !== null}
      />
    </div>
  )
}

interface OAuthButtonProps {
  provider: OAuthProvider
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

function OAuthButton({ provider, onClick, loading, disabled }: OAuthButtonProps) {
  const providerInfo = getOAuthProviderInfo(provider)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full flex items-center justify-center gap-3 px-4 py-3
        border rounded-lg font-medium transition-all duration-200
        ${provider === 'google' 
          ? 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50' 
          : 'border-transparent bg-[#FEE500] hover:bg-[#FDD835]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: provider === 'google' ? '#ffffff' : providerInfo.bgColor,
        color: providerInfo.textColor
      }}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {provider === 'google' ? (
            <GoogleIcon />
          ) : (
            <KakaoIcon />
          )}
          <span>{providerInfo.name}로 계속하기</span>
        </>
      )}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" fillRule="evenodd">
        <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </g>
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M9 1C4.58 1 1 3.816 1 7.267c0 2.173 1.416 4.09 3.56 5.21-.156.594-.566 2.158-.583 2.29-.021.164.06.162.126.118.052-.034 2.294-1.592 3.248-2.256.546.078 1.1.117 1.649.117 4.42 0 8-2.752 8-6.134C17 3.816 13.42 1 9 1"
        fill="#000000"
        fillRule="evenodd"
      />
    </svg>
  )
}