/**
 * Network Utility Functions
 * 네트워크 연결 확인 및 에러 처리 유틸리티
 */

export interface NetworkCheckResult {
  isOnline: boolean
  latency?: number
  error?: string
}

/**
 * 네트워크 연결 상태 확인
 * @param timeoutMs - 타임아웃 (밀리초, 기본값: 5000)
 * @returns 네트워크 연결 상태
 */
export async function checkNetworkConnection(
  timeoutMs: number = 5000
): Promise<NetworkCheckResult> {
  const startTime = Date.now()

  try {
    // navigator.onLine으로 먼저 체크 (빠른 로컬 체크)
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return {
        isOnline: false,
        error: 'No internet connection detected (offline mode)'
      }
    }

    // 실제 네트워크 요청으로 검증 (timeout 적용)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const latency = Date.now() - startTime

    if (response.ok) {
      return {
        isOnline: true,
        latency
      }
    } else {
      return {
        isOnline: false,
        error: `Health check failed with status ${response.status}`
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          isOnline: false,
          latency,
          error: `Network timeout after ${timeoutMs}ms`
        }
      }

      return {
        isOnline: false,
        latency,
        error: error.message
      }
    }

    return {
      isOnline: false,
      latency,
      error: 'Unknown network error'
    }
  }
}

/**
 * Fetch with network check and retry
 * 네트워크 확인 후 fetch 요청 (재시도 포함)
 *
 * @param url - 요청 URL
 * @param options - Fetch options
 * @param retries - 최대 재시도 횟수 (기본값: 3)
 * @param retryDelay - 재시도 간격 (밀리초, 기본값: 1000)
 * @returns Fetch response
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // 첫 시도 전에만 네트워크 체크 (성능 최적화)
      if (attempt === 0) {
        const networkCheck = await checkNetworkConnection()
        if (!networkCheck.isOnline) {
          throw new Error(`Network unavailable: ${networkCheck.error}`)
        }
      }

      const response = await fetch(url, {
        ...options,
        signal: options?.signal || AbortSignal.timeout(10000) // 10초 기본 타임아웃
      })

      // 성공 응답이면 바로 반환
      if (response.ok) {
        return response
      }

      // 4xx 에러는 재시도하지 않음 (클라이언트 에러)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status} ${response.statusText}`)
      }

      // 5xx 에러는 재시도 (서버 에러)
      lastError = new Error(`Server error: ${response.status} ${response.statusText}`)

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      console.warn(`[Network] Fetch attempt ${attempt + 1}/${retries} failed:`, lastError.message)

      // 마지막 시도가 아니면 재시도 대기
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  // 모든 재시도 실패
  throw new Error(`Failed after ${retries} attempts: ${lastError?.message || 'Unknown error'}`)
}

/**
 * 에러를 사용자 친화적인 메시지로 변환
 * @param error - Error object
 * @returns 사용자에게 표시할 메시지
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // 네트워크 관련 에러
    if (error.message.includes('fetch failed') || error.message.includes('Network')) {
      return '네트워크 연결을 확인해주세요. 인터넷이 연결되어 있는지 확인하세요.'
    }

    // 타임아웃 에러
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      return '요청 시간이 초과되었습니다. 네트워크 상태를 확인하고 다시 시도해주세요.'
    }

    // 서버 에러
    if (error.message.includes('Server error')) {
      return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }

    // 클라이언트 에러
    if (error.message.includes('Client error')) {
      return '요청이 잘못되었습니다. 페이지를 새로고침하고 다시 시도해주세요.'
    }

    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * 로그 레벨
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * 상세한 에러 로깅
 * @param level - 로그 레벨
 * @param context - 컨텍스트 (예: 'AdminDashboard', 'ChannelManager')
 * @param message - 로그 메시지
 * @param data - 추가 데이터
 */
export function logError(
  level: LogLevel,
  context: string,
  message: string,
  data?: any
) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] [${context}] ${message}`

  switch (level) {
    case LogLevel.DEBUG:
      if (process.env.NODE_ENV === 'development') {
        console.debug(logMessage, data || '')
      }
      break
    case LogLevel.INFO:
      console.info(logMessage, data || '')
      break
    case LogLevel.WARN:
      console.warn(logMessage, data || '')
      break
    case LogLevel.ERROR:
      console.error(logMessage, data || '')
      break
  }
}
