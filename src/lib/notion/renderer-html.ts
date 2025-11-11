// HTML 문자열 생성을 위한 유틸리티 함수들
import { getProxiedImageUrl } from './converter'

// HTML 이스케이프
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// YouTube ID 추출 (개선된 버전)
function extractYouTubeId(url: string): string | null {
  // 다양한 YouTube URL 형식 처리
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      console.log(`Extracted YouTube ID: ${match[1]} from URL: ${url}`)
      return match[1]
    }
  }

  console.warn(`Could not extract YouTube ID from URL: ${url}`)
  return null
}

// Vimeo ID 추출 (개선된 버전)
function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      console.log(`Extracted Vimeo ID: ${match[1]} from URL: ${url}`)
      return match[1]
    }
  }

  console.warn(`Could not extract Vimeo ID from URL: ${url}`)
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
export function renderBlockToHtml(block: any, pageId?: string): string {
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
      // 이미지 블록 디버깅
      console.log('Image block detected:', JSON.stringify(block.image, null, 2))

      let imageUrl = ''

      // Notion API v2 이미지 구조 처리
      if (block.image?.file?.url) {
        imageUrl = block.image.file.url
        console.log('Found image URL in file:', imageUrl)
      } else if (block.image?.external?.url) {
        imageUrl = block.image.external.url
        console.log('Found image URL in external:', imageUrl)
      } else if (block.image?.type === 'file' && block.image?.file) {
        imageUrl = block.image.file.url || block.image.file
        console.log('Found image URL in type=file:', imageUrl)
      } else if (block.image?.type === 'external' && block.image?.external) {
        imageUrl = block.image.external.url || block.image.external
        console.log('Found image URL in type=external:', imageUrl)
      }

      if (!imageUrl) {
        console.error('Image URL not found. Block structure:', block)
        return '<!-- Image block found but URL extraction failed -->'
      }

      // 캡션 처리
      let captionHtml = ''
      if (block.image?.caption && block.image.caption.length > 0) {
        captionHtml = `<figcaption class="text-center text-sm text-gray-600 mt-2">${renderRichTextToHtml(block.image.caption)}</figcaption>`
      }

      // Use image proxy to avoid 403 errors from expired AWS tokens
      const proxiedImageUrl = getProxiedImageUrl(imageUrl, pageId)

      return `
        <figure class="my-6">
          <img
            src="${proxiedImageUrl}"
            alt=""
            class="w-full rounded-lg"
            loading="lazy"
          />
          ${captionHtml}
        </figure>
      `

    case 'video':
      // 비디오 블록 구조 디버깅
      console.log('Video block structure:', JSON.stringify(value, null, 2))

      // 비디오 URL 추출 (다양한 구조 처리)
      let videoUrl = ''
      if (value?.external?.url) {
        videoUrl = value.external.url
      } else if (value?.file?.url) {
        videoUrl = value.file.url
      } else if (value?.url) {
        videoUrl = value.url
      }

      if (!videoUrl) {
        console.warn('No video URL found in block:', value)
        return ''
      }

      console.log(`Processing video URL: ${videoUrl}`)

      // YouTube 처리
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const youtubeId = extractYouTubeId(videoUrl)
        if (youtubeId) {
          return `
            <div class="my-6 relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe
                src="https://www.youtube.com/embed/${youtubeId}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                class="rounded-lg"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
              </iframe>
            </div>
          `
        }
      }

      // Vimeo 처리
      if (videoUrl.includes('vimeo.com')) {
        const vimeoId = extractVimeoId(videoUrl)
        if (vimeoId) {
          return `
            <div class="my-6 relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe
                src="https://player.vimeo.com/video/${vimeoId}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                class="rounded-lg"
                frameborder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
          `
        }
      }

      // 일반 비디오
      return `
        <video controls class="w-full my-6 rounded-lg">
          <source src="${videoUrl}" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      `

    case 'embed':
      // 임베드 블록 구조 디버깅
      console.log('Embed block structure:', JSON.stringify(value, null, 2))

      const embedUrl = value?.url || ''
      if (!embedUrl) {
        console.warn('No embed URL found in block:', value)
        return ''
      }

      console.log(`Processing embed URL: ${embedUrl}`)

      // YouTube 임베드
      if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
        const youtubeId = extractYouTubeId(embedUrl)
        if (youtubeId) {
          return `
            <div class="my-6 relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe
                src="https://www.youtube.com/embed/${youtubeId}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                class="rounded-lg"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen>
              </iframe>
            </div>
          `
        }
      }

      // Vimeo 임베드
      if (embedUrl.includes('vimeo.com')) {
        const vimeoId = extractVimeoId(embedUrl)
        if (vimeoId) {
          return `
            <div class="my-6 relative" style="padding-bottom: 56.25%; height: 0; overflow: hidden;">
              <iframe
                src="https://player.vimeo.com/video/${vimeoId}"
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                class="rounded-lg"
                frameborder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowfullscreen>
              </iframe>
            </div>
          `
        }
      }

      // 기타 임베드 (Twitter, Instagram 등)
      return `
        <div class="my-6">
          <iframe
            src="${embedUrl}"
            class="w-full h-96 rounded-lg border"
            frameborder="0"
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

      // 🔥 Render children blocks if they exist
      const calloutChildren = block.children
        ? block.children.map((child: any) => renderBlockToHtml(child, pageId)).join('')
        : ''

      console.log(`[renderBlockToHtml] Callout block with ${block.children?.length || 0} children`)

      return `
        <div class="bg-gray-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-lg">
          <div class="flex">
            <span class="mr-2 text-xl">${icon}</span>
            <div class="flex-1">
              <div>${renderRichTextToHtml(value.rich_text)}</div>
              ${calloutChildren ? `<div class="mt-2">${calloutChildren}</div>` : ''}
            </div>
          </div>
        </div>
      `

    case 'toggle':
      // 🔥 Use block.children instead of value.children
      const toggleContent = block.children
        ? block.children.map((child: any) => renderBlockToHtml(child, pageId)).join('')
        : ''

      console.log(`[renderBlockToHtml] Toggle block with ${block.children?.length || 0} children`)

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