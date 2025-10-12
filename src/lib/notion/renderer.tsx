import React from 'react'

// YouTube URL 파싱
function getYouTubeEmbedUrl(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`
  }
  return null
}

// Vimeo URL 파싱
function getVimeoEmbedUrl(url: string): string | null {
  const regExp = /vimeo\.com\/(\d+)/
  const match = url.match(regExp)
  if (match && match[1]) {
    return `https://player.vimeo.com/video/${match[1]}`
  }
  return null
}

export function renderBlock(block: any) {
  const { type, id } = block
  const value = block[type]

  switch (type) {
    case 'paragraph':
      return (
        <p key={id} className="mb-4 text-gray-700 leading-relaxed">
          {renderRichText(value.rich_text)}
        </p>
      )
    case 'heading_1':
      return (
        <h1 key={id} className="text-3xl font-bold mb-4 mt-8">
          {renderRichText(value.rich_text)}
        </h1>
      )
    case 'heading_2':
      return (
        <h2 key={id} className="text-2xl font-bold mb-3 mt-6">
          {renderRichText(value.rich_text)}
        </h2>
      )
    case 'heading_3':
      return (
        <h3 key={id} className="text-xl font-bold mb-2 mt-4">
          {renderRichText(value.rich_text)}
        </h3>
      )
    case 'bulleted_list_item':
      return (
        <li key={id} className="ml-4 mb-2 list-disc">
          {renderRichText(value.rich_text)}
        </li>
      )
    case 'numbered_list_item':
      return (
        <li key={id} className="ml-4 mb-2 list-decimal">
          {renderRichText(value.rich_text)}
        </li>
      )
    case 'quote':
      return (
        <blockquote key={id} className="border-l-4 border-founder-primary pl-4 my-4 italic">
          {renderRichText(value.rich_text)}
        </blockquote>
      )
    case 'code':
      return (
        <pre key={id} className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto mb-4">
          <code className={`text-sm language-${value.language || 'plaintext'}`}>
            {renderRichText(value.rich_text)}
          </code>
        </pre>
      )
    case 'image':
      const imgSrc = value.type === 'external' ? value.external.url : value.file?.url
      const caption = value.caption ? renderRichText(value.caption) : ''
      const captionText = typeof caption === 'string' ? caption : ''
      return (
        <figure key={id} className="my-6">
          <img src={imgSrc} alt={captionText} className="rounded-lg w-full" />
          {caption && (
            <figcaption className="text-center text-sm text-gray-600 mt-2">
              {caption}
            </figcaption>
          )}
        </figure>
      )
    case 'video':
      const videoUrl = value.external?.url || value.file?.url

      // YouTube 처리
      const youtubeEmbed = getYouTubeEmbedUrl(videoUrl)
      if (youtubeEmbed) {
        return (
          <div key={id} className="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
            <iframe
              src={youtubeEmbed}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      }

      // Vimeo 처리
      const vimeoEmbed = getVimeoEmbedUrl(videoUrl)
      if (vimeoEmbed) {
        return (
          <div key={id} className="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
            <iframe
              src={vimeoEmbed}
              className="absolute top-0 left-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      }

      // 일반 비디오
      return (
        <video key={id} controls className="w-full my-6 rounded-lg">
          <source src={videoUrl} />
        </video>
      )
    case 'embed':
      const embedUrl = value.url

      // YouTube 임베드
      if (embedUrl?.includes('youtube.com') || embedUrl?.includes('youtu.be')) {
        const youtubeEmbedUrl = getYouTubeEmbedUrl(embedUrl)
        if (youtubeEmbedUrl) {
          return (
            <div key={id} className="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
              <iframe
                src={youtubeEmbedUrl}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
      }

      // Vimeo 임베드
      if (embedUrl?.includes('vimeo.com')) {
        const vimeoEmbedUrl = getVimeoEmbedUrl(embedUrl)
        if (vimeoEmbedUrl) {
          return (
            <div key={id} className="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
              <iframe
                src={vimeoEmbedUrl}
                className="absolute top-0 left-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        }
      }

      // 일반 iframe 임베드
      return (
        <div key={id} className="my-6">
          <iframe
            src={embedUrl}
            className="w-full h-96 rounded-lg border"
            allowFullScreen
          />
        </div>
      )
    case 'callout':
      return (
        <div key={id} className="bg-gray-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-lg">
          <div className="flex">
            <span className="mr-2 text-xl">{value.icon?.emoji || '💡'}</span>
            <div className="flex-1">{renderRichText(value.rich_text)}</div>
          </div>
        </div>
      )
    case 'toggle':
      return (
        <details key={id} className="my-4 p-4 border rounded-lg">
          <summary className="cursor-pointer font-semibold">
            {renderRichText(value.rich_text)}
          </summary>
          {value.children && (
            <div className="mt-2">
              {value.children.map((child: any) => renderBlock(child))}
            </div>
          )}
        </details>
      )
    case 'divider':
      return <hr key={id} className="my-8 border-gray-300" />
    case 'table':
      return (
        <div key={id} className="overflow-x-auto my-6">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              {value.children?.map((row: any) => (
                <tr key={row.id}>
                  {row.table_row?.cells?.map((cell: any, cellIndex: number) => (
                    <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm">
                      {renderRichText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'column_list':
      return (
        <div key={id} className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {value.children?.map((column: any) => (
            <div key={column.id} className="space-y-4">
              {column.column?.children?.map((child: any) => renderBlock(child))}
            </div>
          ))}
        </div>
      )
    default:
      console.warn(`Unsupported block type: ${type}`)
      return null
  }
}

function renderRichText(richTexts: any[]) {
  if (!richTexts || richTexts.length === 0) return null

  return richTexts.map((text, index) => {
    const { annotations, plain_text, href } = text
    let element = <span key={index}>{plain_text}</span>

    // Apply text styles
    if (annotations.bold) {
      element = <strong key={index}>{element}</strong>
    }
    if (annotations.italic) {
      element = <em key={index}>{element}</em>
    }
    if (annotations.strikethrough) {
      element = <del key={index}>{element}</del>
    }
    if (annotations.underline) {
      element = <u key={index}>{element}</u>
    }
    if (annotations.code) {
      element = (
        <code key={index} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
          {plain_text}
        </code>
      )
    }

    // Apply background color
    const bgColor = annotations.color
    if (bgColor && bgColor !== 'default') {
      const colorMap: Record<string, string> = {
        'gray_background': 'bg-gray-100',
        'brown_background': 'bg-amber-100',
        'orange_background': 'bg-orange-100',
        'yellow_background': 'bg-yellow-100',
        'green_background': 'bg-green-100',
        'blue_background': 'bg-blue-100',
        'purple_background': 'bg-purple-100',
        'pink_background': 'bg-pink-100',
        'red_background': 'bg-red-100',
        // Text colors
        'gray': 'text-gray-600',
        'brown': 'text-amber-600',
        'orange': 'text-orange-600',
        'yellow': 'text-yellow-600',
        'green': 'text-green-600',
        'blue': 'text-blue-600',
        'purple': 'text-purple-600',
        'pink': 'text-pink-600',
        'red': 'text-red-600',
      }

      const colorClass = colorMap[bgColor] || ''
      if (colorClass) {
        const isBackground = bgColor.includes('background')
        element = (
          <span key={index} className={`${colorClass} ${isBackground ? 'px-1 rounded' : ''}`}>
            {element}
          </span>
        )
      }
    }

    // Apply link
    if (href) {
      element = (
        <a
          key={index}
          href={href}
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {element}
        </a>
      )
    }

    return element
  })
}