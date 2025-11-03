/**
 * YouTube 산업 카테고리 매핑
 * 카테고리 번호(Y01~Y15) 기반 인식
 */

// 카테고리 번호 → 이름 매핑
export const CATEGORY_CODE_MAP: Record<string, string> = {
  'Y01': '패션',
  'Y02': '뷰티',
  'Y03': '먹방',
  'Y04': '코미디',
  'Y05': '여행',
  'Y06': '게임',
  'Y07': '펫·동물',
  'Y08': 'IT·과학기술',
  'Y09': '키즈·영화·애니메이션',
  'Y10': '음악',
  'Y11': '스포츠',
  'Y12': '헬스·다이어트',
  'Y13': '투자·경제',
  'Y14': '요리',
  'Y15': 'V-Tube·버추얼'
}

// 카테고리 이름 → 번호 매핑 (역방향)
export const CATEGORY_NAME_MAP: Record<string, string> = {
  '패션': 'Y01',
  '뷰티': 'Y02',
  '먹방': 'Y03',
  '코미디': 'Y04',
  '여행': 'Y05',
  '게임': 'Y06',
  '펫·동물': 'Y07',
  'IT·과학기술': 'Y08',
  '키즈·영화·애니메이션': 'Y09',
  '음악': 'Y10',
  '스포츠': 'Y11',
  '헬스·다이어트': 'Y12',
  '투자·경제': 'Y13',
  '요리': 'Y14',
  'V-Tube·버추얼': 'Y15'
}

/**
 * 카테고리 번호 정규화
 * @param code - 입력된 카테고리 번호 (예: "y14", "Y14", " Y14 ")
 * @returns 정규화된 코드 (예: "Y14") 또는 null
 */
export function normalizeCategoryCode(code: string | undefined): string | null {
  if (!code) return null

  // 공백 제거 및 대문자 변환
  const normalized = code.trim().toUpperCase()

  // Y01~Y15 형식 검증
  if (/^Y(0[1-9]|1[0-5])$/.test(normalized)) {
    return normalized
  }

  return null
}

/**
 * 카테고리 이름 정규화
 * @param name - 입력된 카테고리 이름
 * @returns 정규화된 이름 또는 null
 */
export function normalizeCategoryName(name: string | undefined): string | null {
  if (!name) return null

  // 공백 제거
  const normalized = name.trim()

  // 정확히 일치하는 이름 찾기
  if (CATEGORY_NAME_MAP[normalized]) {
    return normalized
  }

  // 대소문자 무시하고 찾기
  const lowerName = normalized.toLowerCase()
  for (const [key] of Object.entries(CATEGORY_NAME_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return key
    }
  }

  return null
}

/**
 * Excel 행에서 카테고리 식별
 * 우선순위: 카테고리번호 > 카테고리 이름
 * @param row - Excel 행 데이터
 * @returns { code: 카테고리 번호, name: 카테고리 이름 } 또는 null
 */
export function identifyCategory(row: {
  카테고리?: string
  카테고리번호?: string
}): { code: string; name: string } | null {
  // 1. 카테고리번호 우선 (더 정확함)
  const codeFromColumn = normalizeCategoryCode(row.카테고리번호)
  if (codeFromColumn) {
    return {
      code: codeFromColumn,
      name: CATEGORY_CODE_MAP[codeFromColumn]
    }
  }

  // 2. 카테고리 컬럼에서 번호 형식 확인 (예: "Y14")
  const codeFromCategory = normalizeCategoryCode(row.카테고리)
  if (codeFromCategory) {
    return {
      code: codeFromCategory,
      name: CATEGORY_CODE_MAP[codeFromCategory]
    }
  }

  // 3. 카테고리 이름으로 fallback
  const nameFromColumn = normalizeCategoryName(row.카테고리)
  if (nameFromColumn) {
    return {
      code: CATEGORY_NAME_MAP[nameFromColumn],
      name: nameFromColumn
    }
  }

  return null
}

/**
 * 카테고리 번호로 DB에서 ID 찾기
 * @param code - 카테고리 번호 (예: "Y14")
 * @param categoryMap - DB에서 가져온 카테고리 맵
 * @returns category_id 또는 null
 */
export function getCategoryIdByCode(
  code: string,
  categoryMap: Map<string, { id: string; code?: string }>
): string | null {
  // 1. 코드로 직접 매칭
  for (const [, value] of categoryMap.entries()) {
    if (value.code === code) {
      return value.id
    }
  }

  // 2. 이름으로 매칭
  const name = CATEGORY_CODE_MAP[code]
  if (name) {
    const entry = categoryMap.get(name.toLowerCase().trim())
    if (entry) {
      return entry.id
    }
  }

  return null
}
