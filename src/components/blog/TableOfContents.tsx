'use client'

import { useEffect, useState, useCallback } from 'react'
import { TocItem, scrollToElement } from '@/utils/toc'

interface TableOfContentsProps {
  items: TocItem[]
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  // Intersection Observer to track which section is currently visible
  useEffect(() => {
    if (items.length === 0) return

    const observers: IntersectionObserver[] = []
    const headingElements: Element[] = []

    // Find all heading elements
    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        headingElements.push(element)
      }
    })

    if (headingElements.length === 0) return

    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-100px 0px -80% 0px', // Trigger when heading is near top
        threshold: 0
      }
    )

    // Observe all headings
    headingElements.forEach((element) => {
      observer.observe(element)
    })

    observers.push(observer)

    // Cleanup
    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [items])

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    scrollToElement(id)

    // Update URL hash without scrolling
    window.history.pushState(null, '', `#${id}`)
  }, [])

  if (items.length === 0) return null

  return (
    <nav className="toc-sidebar" aria-label="Table of contents">
      <div className="toc-header">
        <h3 className="text-base font-semibold text-gray-900 mb-4">목차</h3>
      </div>

      <ul className="toc-list space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className={`
              toc-item
              toc-level-${item.level}
              ${item.level === 3 ? 'pl-4' : ''}
              ${activeId === item.id ? 'active' : ''}
            `}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={`
                block py-1 px-3 text-sm rounded-md
                transition-all duration-200
                border-l-3
                ${activeId === item.id
                  ? 'border-l-4 border-medium-green text-medium-green font-semibold bg-green-50'
                  : 'border-l-4 border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
                ${item.level === 2 ? 'font-medium' : 'font-normal text-[13px]'}
              `}
              aria-current={activeId === item.id ? 'location' : undefined}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
