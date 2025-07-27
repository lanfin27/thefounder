'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-lg max-w-none"
      components={{
        // Korean-optimized typography
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900 leading-tight">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900 leading-tight">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-bold mt-4 mb-2 text-gray-900 leading-tight">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-4 text-gray-700 leading-relaxed text-base">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-4 space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-4 space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-gray-700">
            {children}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-founder-primary pl-4 my-4 italic text-gray-700">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          const inline = !match
          
          return inline ? (
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          ) : (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-lg my-4 text-sm"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          )
        },
        img: ({ src, alt }) => {
          if (!src) return null
          
          return (
            <figure className="my-6">
              <div className="relative w-full h-auto rounded-lg overflow-hidden">
                <img
                  src={src}
                  alt={alt || ''}
                  className="w-full h-auto"
                />
              </div>
              {alt && (
                <figcaption className="text-center text-sm text-gray-600 mt-2">
                  {alt}
                </figcaption>
              )}
            </figure>
          )
        },
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-founder-primary hover:underline"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        hr: () => (
          <hr className="my-8 border-gray-300" />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-gray-300">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 bg-gray-50 text-left text-sm font-medium text-gray-900">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-sm text-gray-700 border-t">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}