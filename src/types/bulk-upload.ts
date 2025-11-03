// Excel 행 데이터 타입
export interface ExcelChannelRow {
  NO?: number
  채널명: string
  카테고리: string
  카테고리번호?: string
  'YouTube URL': string
}

// 검증 결과 타입
export interface ChannelValidationResult {
  rowIndex: number
  channelName: string
  categoryName: string
  youtubeUrl: string
  status: 'success' | 'error'
  errorType?: 'invalid-url' | 'api-error' | 'duplicate' | 'invalid-category' | 'missing-field'
  errorMessage?: string
  channelData?: {
    channelId: string
    title: string
    customUrl?: string
    subscriberCount: number
    videoCount: number
    viewCount: number
    thumbnailUrl: string
  }
}

// 일괄 검증 응답 타입
export interface BulkValidationResponse {
  success: boolean
  total: number
  successCount: number
  errorCount: number
  results: ChannelValidationResult[]
}

// 일괄 삽입 요청 타입
export interface BulkInsertRequest {
  channels: Array<{
    youtubeUrl: string
    categoryName: string
    memo?: string
  }>
}
