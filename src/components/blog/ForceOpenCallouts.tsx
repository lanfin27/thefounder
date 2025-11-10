'use client'

import { useEffect } from 'react'

/**
 * Force open all Notion toggle callouts with comprehensive debugging
 * Prevents callouts from being collapsed/hidden
 */
export default function ForceOpenCallouts() {
  useEffect(() => {
    console.log('=== 🔬 콜아웃 디버깅 시작 ===')

    // Comprehensive selector debugging
    const debugSelectors = () => {
      const selectors = [
        'details',
        '.notion-callout',
        '[class*="callout"]',
        '.notion-toggle',
        '[class*="toggle"]',
        'details.notion-callout',
        'div.notion-callout',
      ]

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector)
        if (elements.length > 0) {
          console.log(`\n📍 선택자 "${selector}" 발견: ${elements.length}개`)

          elements.forEach((el, index) => {
            console.log(`\n--- ${selector} #${index + 1} ---`)
            console.log('태그명:', el.tagName)
            console.log('클래스:', el.className)
            console.log('전체 클래스 리스트:', Array.from(el.classList))

            // Details tag check
            if (el.tagName.toLowerCase() === 'details') {
              const details = el as HTMLDetailsElement
              console.log('open 속성:', details.open)
            }

            // Computed styles
            const computed = window.getComputedStyle(el)
            console.log('스타일:', {
              display: computed.display,
              overflow: computed.overflow,
              maxHeight: computed.maxHeight,
              height: computed.height,
              visibility: computed.visibility,
              opacity: computed.opacity,
            })

            // Children analysis
            console.log('자식 요소 수:', el.children.length)
            Array.from(el.children).forEach((child, childIndex) => {
              const childComputed = window.getComputedStyle(child)
              console.log(`  자식 ${childIndex + 1}:`, {
                tagName: child.tagName,
                className: child.className,
                display: childComputed.display,
                overflow: childComputed.overflow,
                height: childComputed.height,
                offsetHeight: (child as HTMLElement).offsetHeight,
              })
            })

            // HTML preview
            console.log('HTML 미리보기:', el.outerHTML.substring(0, 500))
          })
        }
      })

      // Title elements
      console.log('\n\n=== 콜아웃 제목 요소 검색 ===')
      const titles = document.querySelectorAll('[class*="callout"] [class*="title"]')
      console.log('제목 요소:', titles.length, '개')

      // Content elements
      console.log('\n=== 콜아웃 내용 요소 검색 ===')
      const contents = document.querySelectorAll('[class*="callout"] [class*="content"]')
      console.log('내용 요소:', contents.length, '개')

      contents.forEach((content, index) => {
        const computed = window.getComputedStyle(content)
        console.log(`내용 #${index + 1}:`, {
          display: computed.display,
          overflow: computed.overflow,
          maxHeight: computed.maxHeight,
          height: computed.height,
          offsetHeight: (content as HTMLElement).offsetHeight,
          innerHTML: content.innerHTML.substring(0, 200),
        })
      })
    }

    // Nuclear option: Force all elements visible
    const forceAllVisible = () => {
      const timestamp = new Date().toISOString()

      // Find all possible callout elements
      const allElements = [
        ...Array.from(document.querySelectorAll('details')),
        ...Array.from(document.querySelectorAll('.notion-callout')),
        ...Array.from(document.querySelectorAll('[class*="callout"]')),
        ...Array.from(document.querySelectorAll('.notion-toggle')),
      ]

      console.log(`\n[${timestamp}] 🔧 강제 표시 실행: ${allElements.length}개 요소`)

      allElements.forEach((el, index) => {
        const htmlEl = el as HTMLElement

        // Force open if details
        if (el.tagName.toLowerCase() === 'details') {
          (el as HTMLDetailsElement).open = true
        }

        // Force visibility styles directly
        htmlEl.style.setProperty('display', 'block', 'important')
        htmlEl.style.setProperty('overflow', 'visible', 'important')
        htmlEl.style.setProperty('max-height', 'none', 'important')
        htmlEl.style.setProperty('height', 'auto', 'important')
        htmlEl.style.setProperty('opacity', '1', 'important')
        htmlEl.style.setProperty('visibility', 'visible', 'important')

        // Force all descendants visible
        const allDescendants = htmlEl.querySelectorAll('*')
        allDescendants.forEach((desc) => {
          const descEl = desc as HTMLElement
          descEl.style.setProperty('display', 'block', 'important')
          descEl.style.setProperty('overflow', 'visible', 'important')
          descEl.style.setProperty('max-height', 'none', 'important')
          descEl.style.setProperty('opacity', '1', 'important')
          descEl.style.setProperty('visibility', 'visible', 'important')
        })

        console.log(`  ✅ #${index + 1} 처리 완료:`, {
          tag: el.tagName,
          class: el.className,
          height: htmlEl.offsetHeight,
        })
      })
    }

    // Run debugging on mount
    debugSelectors()

    // Force visible immediately
    forceAllVisible()

    // Retry at multiple intervals
    const timeouts = [100, 500, 1000, 2000]
    timeouts.forEach((delay) => {
      setTimeout(() => {
        console.log(`\n⏰ ${delay}ms 후 재실행`)
        forceAllVisible()
      }, delay)
    })

    // Create MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
          const target = mutation.target as HTMLDetailsElement
          if (!target.open) {
            console.log('[ForceOpenCallouts] ⚠️ 닫힌 콜아웃 감지, 재오픈')
            target.open = true
          }
        }

        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const hasCallouts =
                node.classList.contains('notion-callout') ||
                node.classList.contains('callout') ||
                node.querySelector('[class*="callout"]')

              if (hasCallouts) {
                console.log('[ForceOpenCallouts] 🆕 새 콜아웃 감지, 강제 표시')
                setTimeout(forceAllVisible, 50)
              }
            }
          })
        }
      })
    })

    // Observe body
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open', 'style', 'class'],
    })

    console.log('\n=== ✅ 디버깅 완료 ===\n')

    // Cleanup
    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
