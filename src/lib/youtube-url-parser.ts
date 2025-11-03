/**
 * YouTube URL Parser
 * Parses various YouTube channel URL formats and extracts the channel identifier
 */

export interface ParsedYouTubeUrl {
  type: 'handle' | 'channel-id' | 'custom-url' | 'username'
  value: string
}

export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  try {
    // Trim whitespace
    url = url.trim()

    // Handle URLs without protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)

    // Must be a YouTube domain
    if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
      return null
    }

    // @핸들 형식: youtube.com/@channelhandle
    if (urlObj.pathname.startsWith('/@')) {
      const handle = urlObj.pathname.substring(2).split('/')[0]
      return { type: 'handle', value: handle }
    }

    // channel ID 형식: youtube.com/channel/UCxxxxx
    if (urlObj.pathname.startsWith('/channel/')) {
      const channelId = urlObj.pathname.split('/channel/')[1].split('/')[0]
      return { type: 'channel-id', value: channelId }
    }

    // 사용자명 형식: youtube.com/c/username
    if (urlObj.pathname.startsWith('/c/')) {
      const customUrl = urlObj.pathname.split('/c/')[1].split('/')[0]
      return { type: 'custom-url', value: customUrl }
    }

    // 사용자명 형식: youtube.com/user/username
    if (urlObj.pathname.startsWith('/user/')) {
      const username = urlObj.pathname.split('/user/')[1].split('/')[0]
      return { type: 'username', value: username }
    }

    // 직접 경로: youtube.com/channelname
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0)
    if (pathParts.length === 1) {
      return { type: 'custom-url', value: pathParts[0] }
    }

    return null
  } catch (error) {
    console.error('[parseYouTubeUrl] Error parsing URL:', url, error)
    return null
  }
}

/**
 * Convert parsed URL to a query parameter for YouTube Data API
 */
export function toYouTubeApiParam(parsed: ParsedYouTubeUrl): { forHandle?: string; forUsername?: string; id?: string } {
  switch (parsed.type) {
    case 'handle':
      return { forHandle: parsed.value }
    case 'channel-id':
      return { id: parsed.value }
    case 'username':
      return { forUsername: parsed.value }
    case 'custom-url':
      return { forHandle: parsed.value } // Try as handle first
    default:
      return {}
  }
}
