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
  console.log(`[YouTube] Processing URL: ${url}`)

  // 다양한 YouTube URL 형식 처리
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,  // YouTube Shorts 지원 추가!
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      console.log(`[YouTube] ✅ Extracted YouTube ID: ${match[1]} from URL: ${url}`)
      return match[1]
    }
  }

  console.warn(`[YouTube] ❌ Could not extract YouTube ID from URL: ${url}`)
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

// Notion Callout 배경색 매핑
function getCalloutBackgroundColor(notionColor: string): string {
  console.log(`[Callout] Converting Notion color to CSS: ${notionColor}`)

  const colorMap: Record<string, string> = {
    // 기본
    'default': 'bg-gray-50',

    // 배경색 시리즈
    'gray_background': 'bg-gray-50',
    'brown_background': 'bg-amber-50',
    'orange_background': 'bg-orange-50',
    'yellow_background': 'bg-yellow-50',
    'green_background': 'bg-green-50',
    'blue_background': 'bg-blue-50',
    'purple_background': 'bg-purple-50',
    'pink_background': 'bg-pink-50',
    'red_background': 'bg-red-50',

    // 텍스트 색상 (같은 배경색 적용)
    'gray': 'bg-gray-50',
    'brown': 'bg-amber-50',
    'orange': 'bg-orange-50',
    'yellow': 'bg-yellow-50',
    'green': 'bg-green-50',
    'blue': 'bg-blue-50',
    'purple': 'bg-purple-50',
    'pink': 'bg-pink-50',
    'red': 'bg-red-50',
  }

  const bgClass = colorMap[notionColor] || colorMap['default']
  console.log(`[Callout] → Tailwind class: ${bgClass}`)

  return bgClass
}

// Notion Callout 테두리색 매핑
function getCalloutBorderColor(notionColor: string): string {
  const borderMap: Record<string, string> = {
    'default': 'border-gray-300',
    'gray_background': 'border-gray-300',
    'gray': 'border-gray-300',
    'brown_background': 'border-amber-300',
    'brown': 'border-amber-300',
    'orange_background': 'border-orange-300',
    'orange': 'border-orange-300',
    'yellow_background': 'border-yellow-300',
    'yellow': 'border-yellow-300',
    'green_background': 'border-green-300',
    'green': 'border-green-300',
    'blue_background': 'border-blue-300',
    'blue': 'border-blue-300',
    'purple_background': 'border-purple-300',
    'purple': 'border-purple-300',
    'pink_background': 'border-pink-300',
    'pink': 'border-pink-300',
    'red_background': 'border-red-300',
    'red': 'border-red-300',
  }

  return borderMap[notionColor] || borderMap['default']
}

// 텍스트 스타일을 HTML 문자열로 변환
function renderRichTextToHtml(richTexts: any[]): string {
  if (!richTexts || richTexts.length === 0) return ''

  console.log('\n[RichText] Processing', richTexts.length, 'segments')

  const htmlSegments = richTexts.map((rt, index) => {
    let content = rt.plain_text || rt.text?.content || ''

    if (!content) return ''

    // ✅ 먼저 줄바꿈을 특수 토큰으로 변환 (escape 전에!)
    content = content.replace(/\n/g, '__LINEBREAK__')

    // HTML escape (보안을 위해)
    content = escapeHtml(content)

    // ✅ 특수 토큰을 <br> 태그로 변환
    content = content.replace(/__LINEBREAK__/g, '<br>\n')

    // Annotations
    if (rt.annotations?.bold) {
      content = `<strong>${content}</strong>`
    }
    if (rt.annotations?.italic) {
      content = `<em>${content}</em>`
    }
    if (rt.annotations?.code) {
      content = `<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em;">${content}</code>`
    }
    if (rt.annotations?.strikethrough) {
      content = `<s>${content}</s>`
    }
    if (rt.annotations?.underline) {
      content = `<u>${content}</u>`
    }

    // Link
    if (rt.href) {
      content = `<a href="${rt.href}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${content}</a>`
    }

    // Color (inline style로 변경)
    const color = rt.annotations?.color
    if (color && color !== 'default') {
      const colorMap: Record<string, string> = {
        'gray_background': 'background-color: #f3f4f6;',
        'brown_background': 'background-color: #fef3c7;',
        'orange_background': 'background-color: #fed7aa;',
        'yellow_background': 'background-color: #fef9c3;',
        'green_background': 'background-color: #d1fae5;',
        'blue_background': 'background-color: #dbeafe;',
        'purple_background': 'background-color: #e9d5ff;',
        'pink_background': 'background-color: #fce7f3;',
        'red_background': 'background-color: #fee2e2;',
        'gray': 'color: #4b5563;',
        'brown': 'color: #d97706;',
        'orange': 'color: #ea580c;',
        'yellow': 'color: #ca8a04;',
        'green': 'color: #059669;',
        'blue': 'color: #2563eb;',
        'purple': 'color: #9333ea;',
        'pink': 'color: #db2777;',
        'red': 'color: #dc2626;',
      }

      const colorStyle = colorMap[color] || ''
      if (colorStyle) {
        const padding = color.includes('background') ? ' padding: 2px 4px; border-radius: 3px;' : ''
        content = `<span style="${colorStyle}${padding}">${content}</span>`
      }
    }

    return content
  }).join('')

  console.log('[RichText] Has line breaks:', htmlSegments.includes('<br>'))

  return htmlSegments
}

// Notion 블록을 HTML 문자열로 변환
export function renderBlockToHtml(block: any, pageId?: string): string {
  const { type, id } = block
  const value = block[type]

  if (!value) return ''

  switch (type) {
    case 'paragraph': {
      const text = renderRichTextToHtml(value.rich_text || [])

      // 빈 문단
      if (!text.trim()) {
        return '<div style="height: 4px;"></div>'
      }

      return `
        <p style="
          margin: 4px 0;
          line-height: 1.5;
          font-size: 15px;
          color: #1f2937;
        ">${text}</p>
      `
    }

    case 'heading_1': {
      const text = renderRichTextToHtml(value.rich_text || [])
      return `
        <h1 style="
          font-size: 1.875rem;
          font-weight: 700;
          margin: 16px 0 8px 0;
          line-height: 1.3;
          color: #111827;
        ">${text}</h1>
      `
    }

    case 'heading_2': {
      const text = renderRichTextToHtml(value.rich_text || [])
      return `
        <h2 style="
          font-size: 1.5rem;
          font-weight: 700;
          margin: 12px 0 6px 0;
          line-height: 1.3;
          color: #111827;
        ">${text}</h2>
      `
    }

    case 'heading_3': {
      const text = renderRichTextToHtml(value.rich_text || [])
      return `
        <h3 style="
          font-size: 1.25rem;
          font-weight: 600;
          margin: 10px 0 4px 0;
          line-height: 1.4;
          color: #111827;
        ">${text}</h3>
      `
    }

    case 'bulleted_list_item': {
      console.log('\n========== BULLETED LIST ITEM ==========')
      console.log('[BulletedList] Block ID:', block.id)

      const text = renderRichTextToHtml(value.rich_text || [])
      console.log('[BulletedList] Text length:', text.length)
      console.log('[BulletedList] Text preview:', text.substring(0, 50))

      console.log('[BulletedList] ✅ Rendered')
      console.log('==========================================\n')

      return `
        <li style="
          margin: 2px 0;
          padding-left: 0;
          line-height: 1.5;
          font-size: 15px;
          color: #1f2937;
        ">${text}</li>
      `
    }

    case 'numbered_list_item': {
      console.log('\n========== NUMBERED LIST ITEM ==========')
      console.log('[NumberedList] Block ID:', block.id)

      const text = renderRichTextToHtml(value.rich_text || [])
      console.log('[NumberedList] Text length:', text.length)
      console.log('[NumberedList] Text preview:', text.substring(0, 50))

      console.log('[NumberedList] ✅ Rendered')
      console.log('==========================================\n')

      return `
        <li style="
          margin: 2px 0;
          padding-left: 0;
          line-height: 1.5;
          font-size: 15px;
          color: #1f2937;
        ">${text}</li>
      `
    }

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

    case 'callout': {
      console.log('\n[Callout] Rendering callout:', id)

      const calloutData = value
      if (!calloutData) {
        console.warn('[Callout] No data')
        return ''
      }

      const text = renderRichTextToHtml(calloutData.rich_text || [])
      const icon = calloutData.icon?.emoji || '💡'
      const color = calloutData.color || 'default'

      // Get background and border colors (inline styles)
      const bgColorMap: Record<string, string> = {
        'default': '#f3f4f6',
        'gray': '#f3f4f6',
        'gray_background': '#f3f4f6',
        'brown_background': '#fef3c7',
        'orange_background': '#fed7aa',
        'yellow_background': '#fef9c3',
        'green_background': '#d1fae5',
        'blue_background': '#dbeafe',
        'purple_background': '#e9d5ff',
        'pink_background': '#fce7f3',
        'red_background': '#fee2e2',
      }

      const borderColorMap: Record<string, string> = {
        'default': '#9ca3af',
        'gray': '#9ca3af',
        'gray_background': '#9ca3af',
        'brown_background': '#d97706',
        'orange_background': '#ea580c',
        'yellow_background': '#ca8a04',
        'green_background': '#059669',
        'blue_background': '#2563eb',
        'purple_background': '#9333ea',
        'pink_background': '#db2777',
        'red_background': '#dc2626',
      }

      const bgColor = bgColorMap[color] || bgColorMap['default']
      const borderColor = borderColorMap[color] || borderColorMap['default']

      console.log('[Callout] Text length:', text.length)
      console.log('[Callout] Has <br>:', text.includes('<br>'))

      let childrenHtml = ''
      if (block.children && block.children.length > 0) {
        childrenHtml = block.children.map((child: any) => renderBlockToHtml(child, pageId)).join('\n')
      }

      return `
        <div style="
          background-color: ${bgColor};
          border-left: 4px solid ${borderColor};
          border-radius: 6px;
          padding: 12px 16px;
          margin: 8px 0;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        ">
          <div style="
            font-size: 22px;
            line-height: 1;
            flex-shrink: 0;
            margin-top: 1px;
          ">${icon}</div>
          <div style="
            flex: 1;
            line-height: 1.5;
            font-size: 15px;
          ">${text}${childrenHtml ? `<div style="margin-top: 4px;">${childrenHtml}</div>` : ''}</div>
        </div>
      `
    }

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