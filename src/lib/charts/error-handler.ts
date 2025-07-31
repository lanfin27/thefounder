// 차트 관련 에러 처리 유틸리티

export type ChartErrorType = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PERMISSION_ERROR'
  | 'UNKNOWN_ERROR'

export interface ChartError {
  type: ChartErrorType
  message: string
  koreanMessage: string
  retryable: boolean
  statusCode?: number
  originalError?: unknown
}

// 에러 타입별 한국어 메시지
const ERROR_MESSAGES: Record<ChartErrorType, { message: string; retryable: boolean }> = {
  NETWORK_ERROR: {
    message: '네트워크 연결을 확인해주세요.',
    retryable: true
  },
  API_ERROR: {
    message: '서버에서 데이터를 가져올 수 없습니다.',
    retryable: true
  },
  PARSE_ERROR: {
    message: '데이터 형식이 올바르지 않습니다.',
    retryable: false
  },
  TIMEOUT_ERROR: {
    message: '요청 시간이 초과되었습니다.',
    retryable: true
  },
  PERMISSION_ERROR: {
    message: '접근 권한이 없습니다.',
    retryable: false
  },
  UNKNOWN_ERROR: {
    message: '알 수 없는 오류가 발생했습니다.',
    retryable: true
  }
}

// 에러 분류 함수
export function classifyError(error: unknown): ChartError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'NETWORK_ERROR',
      message: error.message,
      koreanMessage: ERROR_MESSAGES.NETWORK_ERROR.message,
      retryable: ERROR_MESSAGES.NETWORK_ERROR.retryable,
      originalError: error
    }
  }

  // API response errors
  if (error instanceof Response) {
    const statusCode = error.status
    let type: ChartErrorType = 'API_ERROR'
    
    if (statusCode === 403 || statusCode === 401) {
      type = 'PERMISSION_ERROR'
    } else if (statusCode === 408 || statusCode === 504) {
      type = 'TIMEOUT_ERROR'
    }

    return {
      type,
      message: `HTTP ${statusCode}: ${error.statusText}`,
      koreanMessage: ERROR_MESSAGES[type].message,
      retryable: ERROR_MESSAGES[type].retryable,
      statusCode,
      originalError: error
    }
  }

  // Parse errors
  if (error instanceof SyntaxError) {
    return {
      type: 'PARSE_ERROR',
      message: error.message,
      koreanMessage: ERROR_MESSAGES.PARSE_ERROR.message,
      retryable: ERROR_MESSAGES.PARSE_ERROR.retryable,
      originalError: error
    }
  }

  // Default unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : String(error),
    koreanMessage: ERROR_MESSAGES.UNKNOWN_ERROR.message,
    retryable: ERROR_MESSAGES.UNKNOWN_ERROR.retryable,
    originalError: error
  }
}

// 재시도 로직 with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      const chartError = classifyError(error)
      if (!chartError.retryable) {
        throw error
      }

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// 에러 로깅 함수
export function logChartError(error: ChartError, context?: Record<string, any>) {
  // Console logging
  console.error('[Chart Error]', {
    type: error.type,
    message: error.message,
    koreanMessage: error.koreanMessage,
    retryable: error.retryable,
    statusCode: error.statusCode,
    context,
    timestamp: new Date().toISOString()
  })

  // Analytics logging
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'chart_error', {
      error_type: error.type,
      error_message: error.message,
      retryable: error.retryable,
      status_code: error.statusCode,
      ...context
    })
  }
}

// 사용자 친화적 에러 메시지 생성
export function getUserFriendlyErrorMessage(error: ChartError): {
  title: string
  description: string
  actions: Array<{ label: string; action: () => void }>
} {
  const baseTitle = '차트를 불러올 수 없습니다'
  
  switch (error.type) {
    case 'NETWORK_ERROR':
      return {
        title: '네트워크 연결 오류',
        description: '인터넷 연결을 확인한 후 다시 시도해주세요.',
        actions: [
          { label: '다시 시도', action: () => window.location.reload() }
        ]
      }
    
    case 'TIMEOUT_ERROR':
      return {
        title: '요청 시간 초과',
        description: '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
        actions: [
          { label: '새로고침', action: () => window.location.reload() }
        ]
      }
    
    case 'PERMISSION_ERROR':
      return {
        title: '접근 권한 없음',
        description: '이 차트를 볼 수 있는 권한이 없습니다.',
        actions: [
          { label: '로그인', action: () => window.location.href = '/login' },
          { label: '홈으로', action: () => window.location.href = '/' }
        ]
      }
    
    default:
      return {
        title: baseTitle,
        description: error.koreanMessage,
        actions: [
          { label: '다시 시도', action: () => window.location.reload() },
          { label: '홈으로', action: () => window.location.href = '/' }
        ]
      }
  }
}