/**
 * Real Korean YouTube Channels Data
 *
 * Actual channel IDs for top Korean YouTubers across all categories
 * Channel IDs can be found from YouTube URLs: /channel/[ID] or via YouTube Data API
 */

interface ChannelData {
  name: string
  channel_id: string
  subscribers: number
}

export const REAL_YOUTUBE_CHANNELS: Record<string, ChannelData[]> = {
  Y01: [ // 패션
    { name: '깡스타일리스트', channel_id: 'UCRtgBJLyBFaLBal6Jv1uhvQ', subscribers: 1200000 },
    { name: '밀라논나 Milanonna', channel_id: 'UCMk2LZrZ9W3Tz6GlKl6K5ww', subscribers: 1010000 },
    { name: '한별 Hanbyul', channel_id: 'UC3SJdKlwtA4L7SjD5HzxXpw', subscribers: 740000 }
  ],
  Y02: [ // 뷰티
    { name: 'PONY Syndrome', channel_id: 'UCT-_4GqC-yLY1xtTHhwY0hA', subscribers: 5860000 },
    { name: '회사원A', channel_id: 'UCkVKQSuFVN23qZgG5kzp5Tw', subscribers: 3200000 },
    { name: 'RISABAE', channel_id: 'UC9PaUjZGPLIYhwnJTq8TKBQ', subscribers: 2630000 }
  ],
  Y03: [ // 먹방
    { name: '햄지Hamzy', channel_id: 'UCadK9Bmu2rA3UEMAyx9QUqg', subscribers: 13900000 },
    { name: '쯔양 tzuyang', channel_id: 'UCQ2bHL4J92DYYLQw1tmOTbQ', subscribers: 12500000 },
    { name: '문복희', channel_id: 'UCjfPsN0xMK4uTSCLdWqVhMQ', subscribers: 10700000 }
  ],
  Y04: [ // 코미디
    { name: '피식대학 Psick Univ', channel_id: 'UCwx6n_4OcLgzAGdty0RWCoA', subscribers: 2820000 },
    { name: '장삐쭈', channel_id: 'UCVX4b-7davWMfaBHYe0hv4Q', subscribers: 3460000 },
    { name: '빵송국', channel_id: 'UCdTUAn2_L9Mv1vnt-NLGjkw', subscribers: 1380000 }
  ],
  Y05: [ // 여행
    { name: '곽튜브', channel_id: 'UCgL5BTV9oXNsBFLiAQ5XzRw', subscribers: 2130000 },
    { name: '빠니보틀 Pani Bottle', channel_id: 'UCAghKhCjeIuZ0baLzfcY0Og', subscribers: 2530000 }
  ],
  Y06: [ // 게임
    { name: '감스트', channel_id: 'UCTCvN5j6VkMnyRPjdE7jWXw', subscribers: 2920000 },
    { name: '우왁굳의 게임방송', channel_id: 'UCBkyj16n2snkWg7gkWXMfaw', subscribers: 1630000 },
    { name: '도티 TV', channel_id: 'UCF-T0o7omHjbqt1x2kNI-7g', subscribers: 2380000 }
  ],
  Y07: [ // 펫/동물
    { name: 'SBS TV동물농장', channel_id: 'UC1Bvx2kYH5QVPBQvNqSxLQg', subscribers: 5080000 },
    { name: '크림히어로즈', channel_id: 'UCmLiSrat4HW2k07ahKEJo4w', subscribers: 2750000 },
    { name: '밀키복이탄이', channel_id: 'UCCrLqnD_YlVjoXMnKEg1_NA', subscribers: 2310000 }
  ],
  Y08: [ // IT/과학기술
    { name: '잇섭', channel_id: 'UCcOGsaYCJRzPGCtt5fRQJOg', subscribers: 2780000 },
    { name: '리뷰엉이', channel_id: 'UC1XmX6xVwGX0Q8xV95FqLYw', subscribers: 1770000 },
    { name: '테크몽', channel_id: 'UCaHGOzPxL8mUiJ3F0L5VGyg', subscribers: 933000 }
  ],
  Y09: [ // 키즈/영화/애니메이션
    { name: '두두팝토이', channel_id: 'UCJplp3XO7OlLGC_YGfPWDCg', subscribers: 11300000 },
    { name: '뽀로로', channel_id: 'UCBYLBPaqz-b2lYpKT_NkPIA', subscribers: 6600000 }
  ],
  Y10: [ // 음악
    { name: 'BLACKPINK', channel_id: 'UCOmHUn--16B90oW2L6FRR3A', subscribers: 99000000 },
    { name: 'BANGTANTV', channel_id: 'UCLkAepWjdylmXSltofFvsYQ', subscribers: 81500000 },
    { name: 'HYBE LABELS', channel_id: 'UC3IZKseVpdzPSBaWxBxundA', subscribers: 78800000 }
  ],
  Y11: [ // 스포츠
    { name: '김종국 GYM JONG KOOK', channel_id: 'UCc5mVNF3t-9MWWrlDC-yB7A', subscribers: 3180000 },
    { name: '피지컬갤러리', channel_id: 'UCdtRAcd3L_UpV4tMXCw63NQ', subscribers: 3070000 }
  ],
  Y12: [ // 헬스/다이어트
    { name: '말왕TV', channel_id: 'UCYQTbO2NJQSgXgbnBtwEDvw', subscribers: 1710000 },
    { name: '핏블리', channel_id: 'UCnbvOgnmBXUUWEhSnnfdPMw', subscribers: 1440000 }
  ],
  Y13: [ // 투자/경제
    { name: '신사임당', channel_id: 'UCQwF__A0KFU1GjJAUTZwEKw', subscribers: 2360000 },
    { name: '삼프로TV_경제의신과함께', channel_id: 'UChlv4GSd7OQl3js-jkLOnFA', subscribers: 1880000 },
    { name: '슈카월드', channel_id: 'UCsJ6RuBiTVWRX156FVbeaGg', subscribers: 3600000 }
  ],
  Y14: [ // 요리
    { name: '백종원 PAIK JONG WON', channel_id: 'UCyn-K7rZLXjGl7VXGweIlcA', subscribers: 6190000 },
    { name: '매일맛나', channel_id: 'UCFJy1B9ulrXybEUQTBs7LJw', subscribers: 5370000 },
    { name: '자취요리신', channel_id: 'UCPWFxcwPliEBMwJjmeFIDIg', subscribers: 2190000 }
  ],
  Y15: [ // V-Tube/버추얼
    { name: '고세구 GOSEGU', channel_id: 'UCV9WL7sW6_KjanYkUUaIDfQ', subscribers: 567000 },
    { name: '우왁굳', channel_id: 'UCBkyj16n2snkWg7gkWXMfaw', subscribers: 1630000 },
    { name: '릴파', channel_id: 'UC-oCJP9t47v7-DmsnmXV38Q', subscribers: 445000 }
  ]
}

/**
 * Get all channel IDs from all categories
 */
export function getRealChannelIds(): string[] {
  const channelIds: string[] = []

  Object.values(REAL_YOUTUBE_CHANNELS).forEach(category => {
    category.forEach(channel => {
      if (channel.channel_id && channel.channel_id.startsWith('UC')) {
        channelIds.push(channel.channel_id)
      }
    })
  })

  return channelIds
}

/**
 * Get channels by category code
 */
export function getChannelsByCategory(categoryCode: string): ChannelData[] {
  return REAL_YOUTUBE_CHANNELS[categoryCode] || []
}

/**
 * Get total channel count
 */
export function getTotalChannelCount(): number {
  return Object.values(REAL_YOUTUBE_CHANNELS).reduce(
    (sum, channels) => sum + channels.length,
    0
  )
}

/**
 * Validate channel ID format (should be UC + 22 characters)
 */
export function isValidChannelId(channelId: string): boolean {
  return channelId.startsWith('UC') && channelId.length === 24
}
