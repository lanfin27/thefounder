/**
 * YouTube URL Parser Utility
 * YouTube URL에서 채널 ID를 추출하고 검증하는 유틸리티
 */

import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

export type YouTubeUrlType = 'channel' | 'handle' | 'custom' | 'user' | 'direct_id' | 'unknown'

export interface ChannelParseResult {
  channelId: string | null
  type: YouTubeUrlType
  original: string
  error?: string
}

/**
 * YouTube URL 타입 감지
 */
export function detectYouTubeUrlType(input: string): YouTubeUrlType {
  const trimmed = input.trim()

  // 직접 채널 ID 입력 (UC로 시작, 24자)
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return 'direct_id'
  }

  // URL이 아닌 경우
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) {
    // @handle 형식
    if (trimmed.startsWith('@')) {
      return 'handle'
    }
    return 'unknown'
  }

  // /channel/UCxxxxx
  if (trimmed.includes('/channel/')) {
    return 'channel'
  }

  // /@handle
  if (trimmed.includes('/@')) {
    return 'handle'
  }

  // /c/customname
  if (trimmed.includes('/c/')) {
    return 'custom'
  }

  // /user/username
  if (trimmed.includes('/user/')) {
    return 'user'
  }

  return 'unknown'
}

/**
 * YouTube URL에서 채널 ID 추출 (동기)
 * /channel/UCxxxxx 형식에서만 동작, 나머지는 API 호출 필요
 */
export function extractChannelIdSync(input: string): string | null {
  const trimmed = input.trim()

  // 1. 이미 채널 ID인 경우
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return trimmed
  }

  // 2. /channel/UCxxxxx 형식
  const channelMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/)
  if (channelMatch) {
    return channelMatch[1]
  }

  return null
}

/**
 * YouTube 채널 ID 유효성 검사
 * - UC로 시작
 * - 정확히 24자
 * - 알파벳, 숫자, 하이픈, 언더스코어만 포함
 */
export function isValidChannelId(channelId: string): boolean {
  if (!channelId) return false

  // UC로 시작, 24자, 영문자/숫자/하이픈/언더스코어만
  return /^UC[\w-]{22}$/.test(channelId)
}

/**
 * @handle을 채널 ID로 변환 (YouTube API 사용)
 */
export async function resolveHandleToChannelId(handle: string): Promise<string | null> {
  try {
    // @ 기호 제거
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle

    console.log(`[URLParser] Resolving handle via YouTube API: @${cleanHandle}`)
    console.log(`[URLParser] API Key present: ${!!process.env.YOUTUBE_API_KEY}`)
    console.log(`[URLParser] API Key length: ${process.env.YOUTUBE_API_KEY?.length}`)

    // YouTube API Search로 채널 찾기
    const response = await youtube.search.list({
      part: ['snippet'],
      q: `@${cleanHandle}`,
      type: ['channel'],
      maxResults: 1
    })

    console.log(`[URLParser] YouTube API response received`)
    console.log(`[URLParser] Items count: ${response.data.items?.length || 0}`)

    if (response.data.items && response.data.items.length > 0) {
      const channelId = response.data.items[0].snippet?.channelId
      const channelTitle = response.data.items[0].snippet?.title
      console.log(`[URLParser] ✓ Resolved @${cleanHandle} -> ${channelId} (${channelTitle})`)
      return channelId || null
    }

    console.warn(`[URLParser] ✗ Handle not found: @${cleanHandle}`)
    return null

  } catch (error: any) {
    console.error(`[URLParser] ✗ Error resolving handle:`, {
      message: error.message,
      code: error.code,
      errors: error.errors,
      stack: error.stack
    })
    return null
  }
}

/**
 * Custom URL 또는 Username을 채널 ID로 변환 (YouTube API 사용)
 */
export async function resolveCustomUrlToChannelId(customUrl: string): Promise<string | null> {
  try {
    console.log(`[YouTubeURLParser] Resolving custom URL: ${customUrl}`)

    // YouTube API Search로 채널 찾기
    const response = await youtube.search.list({
      part: ['snippet'],
      q: customUrl,
      type: ['channel'],
      maxResults: 5 // 여러 결과 중 정확히 일치하는 것 찾기
    })

    if (response.data.items && response.data.items.length > 0) {
      // 정확히 일치하는 커스텀 URL 찾기
      for (const item of response.data.items) {
        const channelCustomUrl = item.snippet?.customUrl?.toLowerCase()
        if (channelCustomUrl === customUrl.toLowerCase()) {
          const channelId = item.snippet?.channelId
          console.log(`[YouTubeURLParser] Resolved ${customUrl} -> ${channelId}`)
          return channelId || null
        }
      }

      // 정확히 일치하는 것이 없으면 첫 번째 결과 사용
      const channelId = response.data.items[0].snippet?.channelId
      console.log(`[YouTubeURLParser] Best match for ${customUrl} -> ${channelId}`)
      return channelId || null
    }

    console.warn(`[YouTubeURLParser] Custom URL not found: ${customUrl}`)
    return null

  } catch (error) {
    console.error(`[YouTubeURLParser] Error resolving custom URL:`, error)
    return null
  }
}

/**
 * YouTube URL에서 채널 ID 추출 (비동기, API 호출 포함)
 * 모든 URL 형식 지원
 */
export async function extractChannelId(input: string): Promise<ChannelParseResult> {
  const trimmed = input.trim()
  const type = detectYouTubeUrlType(trimmed)

  console.log(`[URLParser] === START ===`)
  console.log(`[URLParser] Input: "${trimmed}"`)
  console.log(`[URLParser] Detected type: ${type}`)

  // 1. 직접 채널 ID
  if (type === 'direct_id') {
    console.log(`[URLParser] ✓ Direct ID found: ${trimmed}`)
    return {
      channelId: trimmed,
      type,
      original: input
    }
  }

  // 2. /channel/UCxxxxx 형식
  if (type === 'channel') {
    const channelId = extractChannelIdSync(trimmed)
    if (channelId) {
      console.log(`[URLParser] ✓ Extracted from /channel/ URL: ${channelId}`)
      return {
        channelId,
        type,
        original: input
      }
    }
  }

  // 3. @handle 형식
  if (type === 'handle') {
    let handle = trimmed

    // URL에서 @handle 추출
    const handleMatch = trimmed.match(/@([\w-]+)/)
    if (handleMatch) {
      handle = `@${handleMatch[1]}`
    }

    console.log(`[URLParser] Resolving handle: ${handle}`)

    const channelId = await resolveHandleToChannelId(handle)
    if (channelId) {
      console.log(`[URLParser] ✓ Handle resolved to channel ID: ${channelId}`)
      return {
        channelId,
        type,
        original: input
      }
    }

    console.log(`[URLParser] ✗ Handle resolution failed: ${handle}`)
    return {
      channelId: null,
      type,
      original: input,
      error: `Handle "${handle}" could not be resolved to a channel ID`
    }
  }

  // 4. /c/customname 형식
  if (type === 'custom') {
    const customMatch = trimmed.match(/\/c\/([\w-]+)/)
    if (customMatch) {
      const customUrl = customMatch[1]
      const channelId = await resolveCustomUrlToChannelId(customUrl)
      if (channelId) {
        return {
          channelId,
          type,
          original: input
        }
      }

      return {
        channelId: null,
        type,
        original: input,
        error: `Custom URL "${customUrl}" could not be resolved`
      }
    }
  }

  // 5. /user/username 형식
  if (type === 'user') {
    const userMatch = trimmed.match(/\/user\/([\w-]+)/)
    if (userMatch) {
      const username = userMatch[1]
      const channelId = await resolveCustomUrlToChannelId(username)
      if (channelId) {
        return {
          channelId,
          type,
          original: input
        }
      }

      return {
        channelId: null,
        type,
        original: input,
        error: `Username "${username}" could not be resolved`
      }
    }
  }

  // 알 수 없는 형식
  return {
    channelId: null,
    type: 'unknown',
    original: input,
    error: `Unrecognized YouTube URL format: "${trimmed}"`
  }
}

/**
 * 여러 URL을 한 번에 파싱
 */
export async function extractChannelIdsBulk(inputs: string[]): Promise<ChannelParseResult[]> {
  const results: ChannelParseResult[] = []

  for (const input of inputs) {
    const result = await extractChannelId(input)
    results.push(result)

    // API rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}

/**
 * 채널 ID 검증 및 정규화
 * - 유효성 검사
 - 대소문자 통일
 */
export function normalizeChannelId(channelId: string): string | null {
  if (!isValidChannelId(channelId)) {
    return null
  }

  // 채널 ID는 대소문자를 구분하므로 원본 그대로 반환
  return channelId.trim()
}

/**
 * YouTube URL 유효성 검사
 */
export function isValidYouTubeUrl(url: string): boolean {
  const type = detectYouTubeUrlType(url)
  return type !== 'unknown'
}
