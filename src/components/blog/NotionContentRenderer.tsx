'use client'

import React from 'react'

interface NotionContentRendererProps {
  content: string
  isRichContent?: boolean
}

export default function NotionContentRenderer({ content, isRichContent = true }: NotionContentRendererProps) {
  if (!isRichContent) {
    // Fallback to simple HTML rendering for markdown content
    return (
      <div
        className="prose prose-lg max-w-none
          prose-headings:font-bold
          prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
          prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3
          prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
          prose-p:mb-4 prose-p:leading-relaxed prose-p:text-gray-700
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-lg prose-img:my-6
          prose-video:rounded-lg prose-video:my-6
          prose-pre:bg-gray-900 prose-pre:text-gray-100
          prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4
          prose-ul:list-disc prose-ul:ml-6
          prose-ol:list-decimal prose-ol:ml-6"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // For rich Notion content, render as HTML directly
  return (
    <div className="notion-content">
      <div
        dangerouslySetInnerHTML={{ __html: content }}
        className="max-w-none"
      />
      <style jsx>{`
        .notion-content :global(iframe) {
          max-width: 100%;
          border-radius: 0.5rem;
        }
        .notion-content :global(video) {
          max-width: 100%;
          border-radius: 0.5rem;
        }
        .notion-content :global(table) {
          width: 100%;
          border-collapse: collapse;
        }
        .notion-content :global(th) {
          background-color: #f9fafb;
          padding: 0.5rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .notion-content :global(td) {
          padding: 0.5rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .notion-content :global(details) {
          margin: 1rem 0;
        }
        .notion-content :global(summary) {
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}