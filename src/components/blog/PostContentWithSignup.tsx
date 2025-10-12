'use client'

import { useState, useEffect } from 'react'
import SignupPromptModal from '@/components/auth/SignupPromptModal'
import MarkdownRenderer from '@/components/blog/MarkdownRenderer'
import { useScrollTrigger } from '@/hooks/useScrollTrigger'

interface PostContentWithSignupProps {
  content: string
  isAuthenticated: boolean
}

export default function PostContentWithSignup({ content, isAuthenticated }: PostContentWithSignupProps) {
  const { triggered } = useScrollTrigger(0.33)
  const [showModal, setShowModal] = useState(false)
  const [hasSeenModal, setHasSeenModal] = useState(false)

  useEffect(() => {
    // Check if modal was already shown in this session
    const shown = sessionStorage.getItem('signup-prompt-shown')
    if (shown) {
      setHasSeenModal(true)
    }
  }, [])

  useEffect(() => {
    // Show modal when user scrolls 1/3 and is not authenticated
    if (triggered && !isAuthenticated && !hasSeenModal) {
      setShowModal(true)
      setHasSeenModal(true)
      // Mark as shown in session storage
      sessionStorage.setItem('signup-prompt-shown', 'true')
    }
  }, [triggered, isAuthenticated, hasSeenModal])

  return (
    <>
      {/* Post content */}
      <MarkdownRenderer content={content} />

      {/* Signup prompt modal */}
      <SignupPromptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}