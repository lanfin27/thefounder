'use client'

import { useState, useEffect } from 'react'
import SignupPromptModal from '@/components/auth/SignupPromptModal'
import { useScrollTrigger } from '@/hooks/useScrollTrigger'

interface PaywallGateProps {
  children: React.ReactNode
  isUserLoggedIn: boolean
  postTitle?: string
  postId?: string
  contentId?: string
  triggerPoint?: number
}

export default function PaywallGate({
  children,
  isUserLoggedIn,
  postTitle,
  postId,
  contentId,
  triggerPoint = 0.33
}: PaywallGateProps) {
  const { triggered } = useScrollTrigger(triggerPoint)
  const [showModal, setShowModal] = useState(false)
  const [isBlurred, setIsBlurred] = useState(false)

  useEffect(() => {
    // Show modal and blur content when user scrolls and is not authenticated
    if (triggered && !isUserLoggedIn) {
      setShowModal(true)
      setIsBlurred(true)
    }
  }, [triggered, isUserLoggedIn])

  // Prevent text selection, copy, and right-click
  useEffect(() => {
    const preventSelection = (e: Event) => {
      if (isBlurred) {
        e.preventDefault()
        return false
      }
    }

    const preventCopy = (e: ClipboardEvent) => {
      if (isBlurred) {
        e.preventDefault()
        e.clipboardData?.setData('text/plain', 'Please sign up to copy content')
        return false
      }
    }

    const preventContextMenu = (e: MouseEvent) => {
      if (isBlurred) {
        e.preventDefault()
        return false
      }
    }

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (isBlurred) {
        // Prevent Ctrl+A, Ctrl+C, Ctrl+X
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'c' || e.key === 'x')) {
          e.preventDefault()
          return false
        }
      }
    }

    if (isBlurred) {
      // Prevent text selection
      document.addEventListener('selectstart', preventSelection)
      document.addEventListener('mousedown', preventSelection)

      // Prevent copy
      document.addEventListener('copy', preventCopy)

      // Prevent right-click
      document.addEventListener('contextmenu', preventContextMenu)

      // Prevent keyboard shortcuts
      document.addEventListener('keydown', preventKeyboardShortcuts)

      // CSS-based prevention
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      document.body.style.msUserSelect = 'none'
      document.body.style.mozUserSelect = 'none'
    }

    return () => {
      document.removeEventListener('selectstart', preventSelection)
      document.removeEventListener('mousedown', preventSelection)
      document.removeEventListener('copy', preventCopy)
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('keydown', preventKeyboardShortcuts)

      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
      document.body.style.msUserSelect = ''
      document.body.style.mozUserSelect = ''
    }
  }, [isBlurred])

  // If user is logged in, show all content without restrictions
  if (isUserLoggedIn) {
    return <>{children}</>
  }

  return (
    <>
      {/* Content with blur and interaction prevention */}
      <div
        className={`
          transition-all duration-500 relative
          ${isBlurred ? 'select-none' : ''}
        `}
        style={{
          filter: isBlurred ? 'blur(8px)' : 'none',
          opacity: isBlurred ? 0.4 : 1,
          pointerEvents: isBlurred ? 'none' : 'auto',
          userSelect: isBlurred ? 'none' : 'auto',
          WebkitUserSelect: isBlurred ? 'none' : 'auto',
          msUserSelect: isBlurred ? 'none' : 'auto',
          MozUserSelect: isBlurred ? 'none' : 'auto'
        }}
        onCopy={(e) => {
          if (isBlurred) {
            e.preventDefault()
            return false
          }
        }}
        onContextMenu={(e) => {
          if (isBlurred) {
            e.preventDefault()
            return false
          }
        }}
      >
        {children}
      </div>

      {/* Gradient overlay when blurred */}
      {isBlurred && (
        <>
          {/* Bottom gradient */}
          <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-[9996]" />

          {/* Overlay message */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9997]">
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <p className="text-xl font-semibold text-gray-800">
                콘텐츠를 보시려면 로그인이 필요합니다
              </p>
            </div>
          </div>
        </>
      )}

      {/* Strong signup prompt modal - cannot be closed */}
      <SignupPromptModal
        isOpen={showModal}
        canClose={false} // Cannot be closed
      />
    </>
  )
}