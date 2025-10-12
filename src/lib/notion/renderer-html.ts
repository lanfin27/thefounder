// HTML 문자열 생성을 위한 유틸리티 함수들

// HTML 이스케이프
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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

// 텍스트 스타일을 HTML 문자열로 변환
function renderRichTextToHtml(richTexts: any[]): string {
  if (!richTexts || richTexts.length === 0) return ''

  return richTexts.map(text => {
    const annotations = text.annotations
    let html = escapeHtml(text.plain_text || '')

    // 링크
    if (text.href) {
      html = `<a href="${text.href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${html}</a>`
    }

    // 텍스트 스타일
    if (annotations.bold) {
      html = `<strong>${html}</strong>`
    }
    if (annotations.italic) {
      html = `<em>${html}</em>`
    }
    if (annotations.strikethrough) {
      html = `<del>${html}</del>`
    }
    if (annotations.underline) {
      html = `<u>${html}</u>`
    }
    if (annotations.code) {
      html = `<code class="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">${html}</code>`
    }

    // 배경색 처리
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
        html = `<span class="${colorClass} ${isBackground ? 'px-1 rounded' : ''}">${html}</span>`
      }
    }

    return html
  }).join('')
}

// Notion 블록을 HTML 문자열로 변환
export function renderBlockToHtml(block: any): string {
  const { type, id } = block
  const value = block[type]

  if (!value) return ''

  switch (type) {
    case 'paragraph':
      return `<p class="mb-4 text-gray-700 leading-relaxed">${renderRichTextToHtml(value.rich_text)}</p>`

    case 'heading_1':
      return `<h1 class="text-3xl font-bold mt-8 mb-4">${renderRichTextToHtml(value.rich_text)}</h1>`

    case 'heading_2':
      return `<h2 class="text-2xl font-bold mt-6 mb-3">${renderRichTextToHtml(value.rich_text)}</h2>`

    case 'heading_3':
      return `<h3 class="text-xl font-semibold mt-4 mb-2">${renderRichTextToHtml(value.rich_text)}</h3>`

    case 'bulleted_list_item':
      return `<li class="ml-6 mb-2 list-disc">${renderRichTextToHtml(value.rich_text)}</li>`

    case 'numbered_list_item':
      return `<li class="ml-6 mb-2 list-decimal">${renderRichTextToHtml(value.rich_text)}</li>`

    case 'image':
      const imageUrl = value.type === 'external' ? value.external?.url : value.file?.url
      if (!imageUrl) return ''
      const caption = value.caption?.length > 0
        ? `<figcaption class="text-center text-sm text-gray-600 mt-2">${renderRichTextToHtml(value.caption)}</figcaption>`
        : ''
      return `<figure class="my-6"><img src="${imageUrl}" alt="" class="w-full rounded-lg"/>${caption}</figure>`

    case 'video':
      const videoUrl = value.external?.url || value.file?.url
      if (!videoUrl) return ''

      // YouTube 처리
      const youtubeEmbed = getYouTubeEmbedUrl(videoUrl)
      if (youtubeEmbed) {
        return `
          <div class="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
            <iframe
              src="${youtubeEmbed}"
              class="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
        `
      }

      // Vimeo 처리
      const vimeoEmbed = getVimeoEmbedUrl(videoUrl)
      if (vimeoEmbed) {
        return `
          <div class="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
            <iframe
              src="${vimeoEmbed}"
              class="absolute top-0 left-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
        `
      }

      // 일반 비디오
      return `<video controls class="w-full my-6 rounded-lg"><source src="${videoUrl}" /></video>`

    case 'embed':
      const embedUrl = value.url
      if (!embedUrl) return ''

      // YouTube 임베드
      if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
        const youtubeEmbedUrl = getYouTubeEmbedUrl(embedUrl)
        if (youtubeEmbedUrl) {
          return `
            <div class="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
              <iframe
                src="${youtubeEmbedUrl}"
                class="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
          `
        }
      }

      // Vimeo 임베드
      if (embedUrl.includes('vimeo.com')) {
        const vimeoEmbedUrl = getVimeoEmbedUrl(embedUrl)
        if (vimeoEmbedUrl) {
          return `
            <div class="my-6 relative pb-[56.25%] h-0 overflow-hidden rounded-lg">
              <iframe
                src="${vimeoEmbedUrl}"
                class="absolute top-0 left-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
          `
        }
      }

      // 일반 iframe 임베드
      return `
        <div class="my-6">
          <iframe
            src="${embedUrl}"
            class="w-full h-96 rounded-lg border"
            allowfullscreen>
          </iframe>
        </div>
      `

    case 'code':
      const codeText = escapeHtml(value.rich_text[0]?.plain_text || '')
      const language = value.language || 'plaintext'
      return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6"><code class="language-${language}">${codeText}</code></pre>`

    case 'quote':
      return `<blockquote class="border-l-4 border-gray-300 pl-4 my-6 italic">${renderRichTextToHtml(value.rich_text)}</blockquote>`

    case 'callout':
      const icon = value.icon?.emoji || '💡'
      return `
        <div class="bg-gray-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-lg">
          <div class="flex">
            <span class="mr-2 text-xl">${icon}</span>
            <div class="flex-1">${renderRichTextToHtml(value.rich_text)}</div>
          </div>
        </div>
      `

    case 'toggle':
      const toggleContent = value.children
        ? value.children.map((child: any) => renderBlockToHtml(child)).join('')
        : ''
      return `
        <details class="my-4 p-4 border rounded-lg">
          <summary class="cursor-pointer font-semibold">${renderRichTextToHtml(value.rich_text)}</summary>
          <div class="mt-2">${toggleContent}</div>
        </details>
      `

    case 'divider':
      return '<hr class="my-8 border-gray-300" />'

    case 'table':
      const rows = value.children?.map((row: any) => {
        const cells = row.table_row?.cells?.map((cell: any, cellIndex: number) =>
          `<td class="px-4 py-2 whitespace-nowrap text-sm">${renderRichTextToHtml(cell)}</td>`
        ).join('') || ''
        return `<tr>${cells}</tr>`
      }).join('') || ''

      return `
        <div class="overflow-x-auto my-6">
          <table class="min-w-full divide-y divide-gray-200">
            <tbody class="bg-white divide-y divide-gray-200">
              ${rows}
            </tbody>
          </table>
        </div>
      `

    case 'column_list':
      const columns = value.children?.map((column: any) => {
        const columnContent = column.column?.children?.map((child: any) => renderBlockToHtml(child)).join('') || ''
        return `<div class="space-y-4">${columnContent}</div>`
      }).join('') || ''

      return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">${columns}</div>`

    default:
      console.warn(`Unsupported block type: ${type}`)
      return ''
  }
}