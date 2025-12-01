/**
 * Authentication Error Handler
 *
 * Provides user-friendly error messages while logging detailed info for developers.
 *
 * - User messages: Generic, friendly, no technical details
 * - Internal logs: Detailed for debugging
 */

/**
 * Authentication error types
 */
export type AuthErrorType =
  | 'rate_limit'
  | 'email_not_sent'
  | 'invalid_email'
  | 'smtp_error'
  | 'network_error'
  | 'unknown_error';

/**
 * Error analysis result
 */
export interface AuthErrorInfo {
  type: AuthErrorType;
  internalMessage: string;  // For developers (console)
  userMessage: string;      // For users (UI)
  shouldShowOAuthFallback: boolean;  // Show OAuth alternative
}

/**
 * Analyze Supabase Auth error and return appropriate messages
 */
export function analyzeAuthError(error: any): AuthErrorInfo {
  // 1. Rate Limit error
  if (
    error?.status === 429 ||
    error?.message?.toLowerCase().includes('rate limit') ||
    error?.message?.toLowerCase().includes('too many requests') ||
    error?.message?.toLowerCase().includes('email rate limit')
  ) {
    return {
      type: 'rate_limit',
      internalMessage: `Rate limit exceeded: ${error.message}. Status: ${error.status}. User may have sent too many emails (Free Plan: 4 emails/hour).`,
      userMessage: '일시적 오류로 인해 이메일 로그인을 사용할 수 없습니다. Google 또는 Kakao 로그인을 이용해주세요.',
      shouldShowOAuthFallback: true,
    };
  }

  // 2. Email not sent
  if (
    error?.message?.toLowerCase().includes('email not sent') ||
    error?.message?.toLowerCase().includes('failed to send') ||
    error?.message?.toLowerCase().includes('unable to send')
  ) {
    return {
      type: 'email_not_sent',
      internalMessage: `Email send failed: ${error.message}. Possible causes: SMTP not configured, Supabase service issue, invalid email template.`,
      userMessage: '일시적 오류로 인해 이메일 로그인을 사용할 수 없습니다. Google 또는 Kakao 로그인을 이용해주세요.',
      shouldShowOAuthFallback: true,
    };
  }

  // 3. Invalid email
  if (
    error?.message?.toLowerCase().includes('invalid email') ||
    error?.message?.toLowerCase().includes('invalid format') ||
    error?.message?.toLowerCase().includes('valid email')
  ) {
    return {
      type: 'invalid_email',
      internalMessage: `Invalid email format: ${error.message}`,
      userMessage: '유효하지 않은 이메일 주소입니다. 이메일 주소를 확인해주세요.',
      shouldShowOAuthFallback: false,
    };
  }

  // 4. SMTP error
  if (
    error?.message?.toLowerCase().includes('smtp') ||
    error?.code === 'smtp_error'
  ) {
    return {
      type: 'smtp_error',
      internalMessage: `SMTP configuration error: ${error.message}. Check Supabase SMTP settings.`,
      userMessage: '일시적 오류로 인해 이메일 로그인을 사용할 수 없습니다. Google 또는 Kakao 로그인을 이용해주세요.',
      shouldShowOAuthFallback: true,
    };
  }

  // 5. Network error
  if (
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch') ||
    error?.message?.toLowerCase().includes('timeout') ||
    error?.message?.toLowerCase().includes('connection')
  ) {
    return {
      type: 'network_error',
      internalMessage: `Network error: ${error.message}. User may have connectivity issues or Supabase service may be down.`,
      userMessage: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.',
      shouldShowOAuthFallback: false,
    };
  }

  // 6. Unknown error (default)
  return {
    type: 'unknown_error',
    internalMessage: `Unknown auth error: ${error?.message || 'No error message'}. Code: ${error?.code}. Status: ${error?.status}. Full error: ${JSON.stringify(error)}`,
    userMessage: '일시적 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    shouldShowOAuthFallback: true,
  };
}

/**
 * Log error to console with detailed information (for developers)
 */
export function logAuthError(error: any, context: string) {
  const errorInfo = analyzeAuthError(error);

  console.group(`[Auth Error] ${context}`);
  console.error('Error Type:', errorInfo.type);
  console.error('Internal Message:', errorInfo.internalMessage);
  console.error('User Message:', errorInfo.userMessage);
  console.error('Show OAuth Fallback:', errorInfo.shouldShowOAuthFallback);
  console.error('Raw Error:', error);
  if (error?.stack) {
    console.error('Error Stack:', error.stack);
  }
  console.groupEnd();

  // In production, you could send to error tracking service
  // if (process.env.NODE_ENV === 'production') {
  //   // Sentry.captureException(error, { context, errorInfo });
  // }
}
