/**
 * Industry Icons Utility - SINGLE SOURCE OF TRUTH
 * 산업별 커스텀 아이콘 및 이름 매핑 시스템
 *
 * ⚠️ 중요: 이 파일이 모든 카테고리 정보의 유일한 소스입니다.
 * 다른 곳에서 카테고리를 하드코딩하지 마세요!
 */

export const INDUSTRY_ICONS: Record<string, string> = {
  'Y01': '🎵',  // 음악
  'Y02': '🎬',  // 영화/애니메이션
  'Y03': '🍜',  // 먹방 ⬅️ 중요: 음식, 요리, ASMR
  'Y04': '🐶',  // 동물
  'Y05': '⚽',  // 스포츠
  'Y06': '✈️',  // 여행/이벤트
  'Y07': '🎮',  // 게임
  'Y08': '👤',  // 인물/블로그
  'Y09': '😂',  // 코미디
  'Y10': '🎭',  // 엔터테인먼트
  'Y11': '📰',  // 뉴스/정치
  'Y12': '💄',  // 노하우/스타일
  'Y13': '📚',  // 교육
  'Y14': '🔬',  // 과학기술
  'Y15': '🤝',  // 비영리/사회운동
}

export const INDUSTRY_NAMES: Record<string, string> = {
  'Y01': '음악',
  'Y02': '영화/애니메이션',
  'Y03': '먹방',
  'Y04': '동물',
  'Y05': '스포츠',
  'Y06': '여행/이벤트',
  'Y07': '게임',
  'Y08': '인물/블로그',
  'Y09': '코미디',
  'Y10': '엔터테인먼트',
  'Y11': '뉴스/정치',
  'Y12': '노하우/스타일',
  'Y13': '교육',
  'Y14': '과학기술',
  'Y15': '비영리/사회운동',
}

export const INDUSTRY_NAMES_EN: Record<string, string> = {
  'Y01': 'Music',
  'Y02': 'Film & Animation',
  'Y03': 'Mukbang',
  'Y04': 'Animals',
  'Y05': 'Sports',
  'Y06': 'Travel & Events',
  'Y07': 'Gaming',
  'Y08': 'People & Blogs',
  'Y09': 'Comedy',
  'Y10': 'Entertainment',
  'Y11': 'News & Politics',
  'Y12': 'Howto & Style',
  'Y13': 'Education',
  'Y14': 'Science & Technology',
  'Y15': 'Nonprofits & Activism',
}

export const INDUSTRY_DESCRIPTIONS: Record<string, string> = {
  'Y01': '음악, K-POP, 앨범, 뮤직비디오',
  'Y02': '영화 리뷰, 애니메이션, 영상 제작',
  'Y03': '음식 리뷰, 먹방, 리얼사운드, ASMR',
  'Y04': '반려동물, 야생동물, 동물 콘텐츠',
  'Y05': '스포츠 경기, 하이라이트, 피트니스',
  'Y06': '여행 브이로그, 이벤트, 문화',
  'Y07': '게임 플레이, 리뷰, e스포츠',
  'Y08': '일상 브이로그, 인물 인터뷰',
  'Y09': '코미디, 예능, 유머',
  'Y10': '엔터테인먼트 뉴스, 아이돌',
  'Y11': '뉴스, 정치 이슈, 시사',
  'Y12': '패션, 뷰티, 메이크업, 노하우',
  'Y13': '교육 콘텐츠, 강의, 튜토리얼',
  'Y14': '과학, 기술, 가젯 리뷰',
  'Y15': '비영리, 사회운동, 환경',
}

/**
 * 각 산업별 대표 색상 (시각화용)
 */
export const INDUSTRY_COLORS: Record<string, string> = {
  'Y01': '#FF6B6B',  // 음악 - 빨강
  'Y02': '#4ECDC4',  // 영화 - 청록
  'Y03': '#FFE66D',  // 먹방 - 노랑 (음식)
  'Y04': '#95E1D3',  // 동물 - 연두
  'Y05': '#F38181',  // 스포츠 - 핑크
  'Y06': '#AA96DA',  // 여행 - 보라
  'Y07': '#FCBAD3',  // 게임 - 핑크
  'Y08': '#FFFFD2',  // 인물 - 연노랑
  'Y09': '#A8D8EA',  // 코미디 - 하늘
  'Y10': '#FFAAA7',  // 엔터 - 주황
  'Y11': '#B8E6B8',  // 뉴스 - 초록
  'Y12': '#FFD93D',  // 노하우 - 노랑
  'Y13': '#6BCB77',  // 교육 - 초록
  'Y14': '#4D96FF',  // 과학 - 파랑
  'Y15': '#FDA769',  // 비영리 - 주황
}

/**
 * 전체 카테고리 코드 배열
 */
export const ALL_CATEGORY_CODES = Object.keys(INDUSTRY_ICONS) as string[]

/**
 * 카테고리 전체 정보 객체
 */
export interface IndustryCategory {
  code: string
  name: string
  nameEn: string
  icon: string
  emoji: string  // alias for icon
  color: string
  description: string
}

/**
 * 산업 코드로 아이콘 이모지를 가져옵니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns 아이콘 이모지 문자열
 */
export function getIndustryIcon(categoryCode: string): string {
  return INDUSTRY_ICONS[categoryCode] || '❓' // 기본 아이콘
}

/**
 * 산업 코드로 산업명을 가져옵니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns 산업명
 */
export function getIndustryName(categoryCode: string): string {
  return INDUSTRY_NAMES[categoryCode] || categoryCode
}

/**
 * 산업 코드로 영문 산업명을 가져옵니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns 영문 산업명
 */
export function getIndustryNameEn(categoryCode: string): string {
  return INDUSTRY_NAMES_EN[categoryCode] || categoryCode
}

/**
 * 산업 코드로 설명을 가져옵니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns 산업 설명
 */
export function getIndustryDescription(categoryCode: string): string {
  return INDUSTRY_DESCRIPTIONS[categoryCode] || ''
}

/**
 * 산업 코드로 대표 색상을 가져옵니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns Hex 색상 코드
 */
export function getIndustryColor(categoryCode: string): string {
  return INDUSTRY_COLORS[categoryCode] || '#CCCCCC'
}

/**
 * 아이콘이 포함된 산업명을 반환합니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns "🎮 게임" 형식의 문자열
 */
export function getIndustryWithIcon(categoryCode: string): string {
  const icon = getIndustryIcon(categoryCode)
  const name = getIndustryName(categoryCode)
  return `${icon} ${name}`
}

/**
 * 전체 산업 카테고리 정보를 배열로 반환합니다
 * @returns IndustryCategory 배열
 */
export function getAllIndustries(): IndustryCategory[] {
  return ALL_CATEGORY_CODES.map(code => ({
    code,
    name: getIndustryName(code),
    nameEn: getIndustryNameEn(code),
    icon: getIndustryIcon(code),
    emoji: getIndustryIcon(code),  // alias
    color: getIndustryColor(code),
    description: getIndustryDescription(code),
  }))
}

/**
 * 특정 카테고리 코드의 전체 정보를 반환합니다
 * @param categoryCode 산업 코드 (Y01~Y15)
 * @returns IndustryCategory 객체
 */
export function getIndustryInfo(categoryCode: string): IndustryCategory {
  return {
    code: categoryCode,
    name: getIndustryName(categoryCode),
    nameEn: getIndustryNameEn(categoryCode),
    icon: getIndustryIcon(categoryCode),
    emoji: getIndustryIcon(categoryCode),
    color: getIndustryColor(categoryCode),
    description: getIndustryDescription(categoryCode),
  }
}
