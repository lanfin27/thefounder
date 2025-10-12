'use client'

import { useEffect } from 'react'

interface ContentProtectionProps {
  isProtected: boolean
  children: React.ReactNode
}

export default function ContentProtection({ isProtected, children }: ContentProtectionProps) {
  useEffect(() => {
    if (isProtected) {
      // Disable text selection
      const style = document.createElement('style')
      style.id = 'content-protection-styles'
      style.innerHTML = `
        .protected-content {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        .protected-content * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        .protected-content::selection,
        .protected-content *::selection {
          background-color: transparent !important;
        }

        .protected-content::-moz-selection,
        .protected-content *::-moz-selection {
          background-color: transparent !important;
        }
      `
      document.head.appendChild(style)

      // Disable developer tools (F12)
      const disableDevTools = (e: KeyboardEvent) => {
        if (e.keyCode === 123) { // F12
          e.preventDefault()
          return false
        }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) { // Ctrl+Shift+I
          e.preventDefault()
          return false
        }
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) { // Ctrl+Shift+J
          e.preventDefault()
          return false
        }
        if (e.ctrlKey && e.keyCode === 85) { // Ctrl+U
          e.preventDefault()
          return false
        }
      }

      // Disable right click
      const disableRightClick = (e: MouseEvent) => {
        e.preventDefault()
        return false
      }

      // Disable text selection
      const disableSelection = (e: Event) => {
        e.preventDefault()
        return false
      }

      // Disable copy
      const disableCopy = (e: ClipboardEvent) => {
        e.preventDefault()
        alert('콘텐츠 복사가 제한되어 있습니다. 무료 회원가입 후 이용해주세요.')
        return false
      }

      // Disable drag
      const disableDrag = (e: DragEvent) => {
        e.preventDefault()
        return false
      }

      // Add event listeners
      document.addEventListener('keydown', disableDevTools)
      document.addEventListener('contextmenu', disableRightClick)
      document.addEventListener('selectstart', disableSelection)
      document.addEventListener('copy', disableCopy)
      document.addEventListener('cut', disableCopy)
      document.addEventListener('dragstart', disableDrag)

      // Disable print
      const beforePrint = (e: Event) => {
        e.preventDefault()
        alert('인쇄가 제한되어 있습니다. 무료 회원가입 후 이용해주세요.')
        return false
      }
      window.addEventListener('beforeprint', beforePrint)

      return () => {
        // Cleanup
        const style = document.getElementById('content-protection-styles')
        if (style) {
          style.remove()
        }

        document.removeEventListener('keydown', disableDevTools)
        document.removeEventListener('contextmenu', disableRightClick)
        document.removeEventListener('selectstart', disableSelection)
        document.removeEventListener('copy', disableCopy)
        document.removeEventListener('cut', disableCopy)
        document.removeEventListener('dragstart', disableDrag)
        window.removeEventListener('beforeprint', beforePrint)
      }
    }
  }, [isProtected])

  if (isProtected) {
    return (
      <div className="protected-content relative">
        {children}
        {/* Invisible overlay to prevent interactions */}
        <div className="absolute inset-0 z-10 pointer-events-auto"
             style={{ background: 'transparent' }}
             onContextMenu={(e) => e.preventDefault()}
             onCopy={(e) => e.preventDefault()}
             onCut={(e) => e.preventDefault()}
             onPaste={(e) => e.preventDefault()}
             onDrag={(e) => e.preventDefault()}
             onDrop={(e) => e.preventDefault()}
             onMouseDown={(e) => {
               if (e.button === 2) {
                 e.preventDefault()
               }
             }}
        />
      </div>
    )
  }

  return <>{children}</>
}