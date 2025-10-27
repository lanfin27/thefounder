/**
 * YouTube Channel Mappings
 *
 * Maps known channel names to their @handles or channel IDs
 * This helps avoid expensive search API calls (100 quota units each)
 *
 * When verifying channels, we first check these mappings before using the search API
 */

interface ChannelMapping {
  names: string[]        // Alternative names for the channel
  handle?: string        // @handle (preferred - 1 quota unit)
  channel_id?: string    // Direct channel ID (most reliable - 1 quota unit)
}

/**
 * Known Korean YouTube Channel Mappings
 * Add new mappings as you discover them to improve verification efficiency
 */
export const CHANNEL_MAPPINGS: Record<string, ChannelMapping> = {
  // 패션 (Y01)
  '깡스타일리스트': {
    names: ['깡스타일리스트', 'kkang stylist'],
    channel_id: 'UCRtgBJLyBFaLBal6Jv1uhvQ'
  },
  '밀라논나': {
    names: ['밀라논나', 'Milanonna', 'Milanonna'],
    channel_id: 'UCMk2LZrZ9W3Tz6GlKl6K5ww'
  },
  '한별': {
    names: ['한별', 'Hanbyul'],
    channel_id: 'UC3SJdKlwtA4L7SjD5HzxXpw'
  },

  // 뷰티 (Y02)
  'PONY Syndrome': {
    names: ['PONY Syndrome', 'PONY', '포니'],
    channel_id: 'UCT-_4GqC-yLY1xtTHhwY0hA'
  },
  '회사원A': {
    names: ['회사원A', 'Heesawon A'],
    channel_id: 'UCkVKQSuFVN23qZgG5kzp5Tw'
  },
  'RISABAE': {
    names: ['RISABAE', '리사배'],
    channel_id: 'UC9PaUjZGPLIYhwnJTq8TKBQ'
  },

  // 먹방 (Y03)
  '햄지': {
    names: ['햄지', 'Hamzy', '햄지Hamzy'],
    channel_id: 'UCadK9Bmu2rA3UEMAyx9QUqg'
  },
  '쯔양': {
    names: ['쯔양', 'tzuyang', '쯔양 tzuyang'],
    channel_id: 'UCQ2bHL4J92DYYLQw1tmOTbQ'
  },
  '문복희': {
    names: ['문복희', 'Eat with Boki'],
    channel_id: 'UCjfPsN0xMK4uTSCLdWqVhMQ'
  },

  // 코미디 (Y04)
  '피식대학': {
    names: ['피식대학', 'Psick Univ', 'Psick University'],
    channel_id: 'UCwx6n_4OcLgzAGdty0RWCoA'
  },
  '장삐쭈': {
    names: ['장삐쭈', 'Jang Bbijju'],
    channel_id: 'UCVX4b-7davWMfaBHYe0hv4Q'
  },
  '빵송국': {
    names: ['빵송국', 'Bbangsongkook'],
    channel_id: 'UCdTUAn2_L9Mv1vnt-NLGjkw'
  },

  // 여행 (Y05)
  '곽튜브': {
    names: ['곽튜브', 'Kwaktube'],
    channel_id: 'UCgL5BTV9oXNsBFLiAQ5XzRw'
  },
  '빠니보틀': {
    names: ['빠니보틀', 'Pani Bottle'],
    channel_id: 'UCAghKhCjeIuZ0baLzfcY0Og'
  },

  // 게임 (Y06)
  '감스트': {
    names: ['감스트', 'Gamst'],
    channel_id: 'UCTCvN5j6VkMnyRPjdE7jWXw'
  },
  '우왁굳의 게임방송': {
    names: ['우왁굳의 게임방송', '우왁굳', 'Woowakgood'],
    channel_id: 'UCBkyj16n2snkWg7gkWXMfaw'
  },
  '도티': {
    names: ['도티', 'Doty', '도티 TV'],
    channel_id: 'UCF-T0o7omHjbqt1x2kNI-7g'
  },

  // 펫/동물 (Y07)
  'SBS TV동물농장': {
    names: ['SBS TV동물농장', 'SBS Animal Farm', 'TV동물농장'],
    channel_id: 'UC1Bvx2kYH5QVPBQvNqSxLQg'
  },
  '크림히어로즈': {
    names: ['크림히어로즈', 'Cream Heroes'],
    channel_id: 'UCmLiSrat4HW2k07ahKEJo4w'
  },
  '밀키복이탄이': {
    names: ['밀키복이탄이', 'MilkyBokiTani'],
    channel_id: 'UCCrLqnD_YlVjoXMnKEg1_NA'
  },

  // IT/과학기술 (Y08)
  '잇섭': {
    names: ['잇섭', 'Itsub'],
    channel_id: 'UCcOGsaYCJRzPGCtt5fRQJOg'
  },
  '리뷰엉이': {
    names: ['리뷰엉이', 'ReviewEongi'],
    channel_id: 'UC1XmX6xVwGX0Q8xV95FqLYw'
  },
  '테크몽': {
    names: ['테크몽', 'Techmong'],
    channel_id: 'UCaHGOzPxL8mUiJ3F0L5VGyg'
  },

  // 키즈/애니메이션 (Y09)
  '두두팝토이': {
    names: ['두두팝토이', 'DuDuPopToy'],
    channel_id: 'UCJplp3XO7OlLGC_YGfPWDCg'
  },
  '뽀로로': {
    names: ['뽀로로', 'Pororo'],
    channel_id: 'UCBYLBPaqz-b2lYpKT_NkPIA'
  },

  // 음악 (Y10)
  'BLACKPINK': {
    names: ['BLACKPINK', '블랙핑크'],
    handle: '@BLACKPINK',
    channel_id: 'UCOmHUn--16B90oW2L6FRR3A'
  },
  'BANGTANTV': {
    names: ['BANGTANTV', 'BTS', '방탄소년단'],
    channel_id: 'UCLkAepWjdylmXSltofFvsYQ'
  },
  'HYBE LABELS': {
    names: ['HYBE LABELS', 'HYBE', 'HYBELABELS'],
    channel_id: 'UC3IZKseVpdzPSBaWxBxundA'
  },

  // 스포츠 (Y11)
  '김종국': {
    names: ['김종국', 'GYM JONG KOOK', 'Kim Jong Kook'],
    channel_id: 'UCc5mVNF3t-9MWWrlDC-yB7A'
  },
  '피지컬갤러리': {
    names: ['피지컬갤러리', 'Physical Gallery'],
    channel_id: 'UCdtRAcd3L_UpV4tMXCw63NQ'
  },

  // 헬스/다이어트 (Y12)
  '말왕TV': {
    names: ['말왕TV', 'Malwang TV'],
    channel_id: 'UCYQTbO2NJQSgXgbnBtwEDvw'
  },
  '핏블리': {
    names: ['핏블리', 'Fit Bliss', 'FitBliss'],
    channel_id: 'UCnbvOgnmBXUUWEhSnnfdPMw'
  },

  // 투자/경제 (Y13)
  '신사임당': {
    names: ['신사임당', 'ShinSaimdang'],
    channel_id: 'UCQwF__A0KFU1GjJAUTZwEKw'
  },
  '삼프로TV': {
    names: ['삼프로TV', '삼프로TV_경제의신과함께', 'SamPro TV'],
    channel_id: 'UChlv4GSd7OQl3js-jkLOnFA'
  },
  '슈카월드': {
    names: ['슈카월드', 'Shuka World'],
    channel_id: 'UCsJ6RuBiTVWRX156FVbeaGg'
  },

  // 요리 (Y14)
  '백종원': {
    names: ['백종원', 'PAIK JONG WON', 'Paik Jong Won'],
    channel_id: 'UCyn-K7rZLXjGl7VXGweIlcA'
  },
  '매일맛나': {
    names: ['매일맛나', 'MaeilMatna'],
    channel_id: 'UCFJy1B9ulrXybEUQTBs7LJw'
  },
  '자취요리신': {
    names: ['자취요리신', 'JachiYoriShin'],
    channel_id: 'UCPWFxcwPliEBMwJjmeFIDIg'
  },

  // V-Tube/버추얼 (Y15)
  '고세구': {
    names: ['고세구', 'GOSEGU'],
    channel_id: 'UCV9WL7sW6_KjanYkUUaIDfQ'
  },
  '릴파': {
    names: ['릴파', 'Lilpa'],
    channel_id: 'UC-oCJP9t47v7-DmsnmXV38Q'
  }
}

/**
 * Find mapping by channel name (case-insensitive, normalized)
 */
export function findMapping(channelName: string): ChannelMapping | null {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\w\uAC00-\uD7A3]/g, '')
  }

  const normalizedQuery = normalize(channelName)

  for (const [key, mapping] of Object.entries(CHANNEL_MAPPINGS)) {
    // Check all alternative names
    for (const name of mapping.names) {
      if (normalize(name) === normalizedQuery) {
        return mapping
      }
    }
  }

  return null
}

/**
 * Get preferred query for a channel (handle > channel_id > name)
 */
export function getPreferredQuery(channelName: string): string {
  const mapping = findMapping(channelName)

  if (!mapping) {
    return channelName // Fallback to original name
  }

  // Prefer @handle (1 quota unit, reliable)
  if (mapping.handle) {
    return mapping.handle
  }

  // Next prefer channel_id (1 quota unit, most reliable)
  if (mapping.channel_id) {
    return mapping.channel_id
  }

  // Fallback to first alternative name
  return mapping.names[0]
}

/**
 * Get total number of mapped channels
 */
export function getMappingCount(): number {
  return Object.keys(CHANNEL_MAPPINGS).length
}
