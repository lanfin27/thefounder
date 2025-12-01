export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

type Props = {
  searchParams: Promise<{
    error?: string
    error_description?: string
    error_code?: string
  }>
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error, error_description, error_code } = await searchParams

  // Common error messages in Korean
  const errorMessages: Record<string, string> = {
    // OAuth errors
    'access_denied': '로그인이 취소되었습니다.',
    'server_error': '서버 오류가 발생했습니다.',
    'temporarily_unavailable': '일시적으로 서비스를 사용할 수 없습니다.',
    'invalid_request': '잘못된 요청입니다.',
    'unauthorized_client': '인증되지 않은 클라이언트입니다.',
    'unsupported_response_type': '지원하지 않는 응답 형식입니다.',
    // Magic Link errors
    'otp_expired': '인증 링크가 만료되었습니다. 새로운 링크를 요청해주세요.',
    'invalid_link': '유효하지 않은 인증 링크입니다. 이미 사용되었거나 잘못된 링크일 수 있습니다.',
    'already_confirmed': '이미 인증이 완료된 계정입니다.',
    'verification_failed': '이메일 인증에 실패했습니다. 다시 시도해주세요.',
    'missing_parameters': '인증 정보가 누락되었습니다. 이메일의 링크를 다시 클릭해주세요.',
    'exchange_failed': '인증 처리 중 오류가 발생했습니다.',
  }

  const errorMessage = error
    ? errorMessages[error] || error_description || '알 수 없는 오류가 발생했습니다.'
    : '로그인 중 오류가 발생했습니다.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>

          <h2 className="text-heading-2 font-serif text-medium-black text-korean">
            로그인 오류
          </h2>

          <p className="mt-4 text-body text-medium-black-secondary">
            {errorMessage}
          </p>

          {error_code && (
            <p className="mt-2 text-body-small text-medium-black-tertiary">
              오류 코드: {error_code}
            </p>
          )}

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && (error || error_description) && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg text-left">
              <p className="text-xs font-mono text-red-800 break-all">
                <strong>Debug Info:</strong><br />
                Error: {error}<br />
                Description: {error_description}<br />
                Code: {error_code}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full btn-primary text-center"
          >
            다시 로그인하기
          </Link>

          <Link
            href="/"
            className="w-full text-center text-body-small text-medium-black-secondary hover:text-medium-black transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>

        {/* Troubleshooting tips */}
        <div className="mt-8 p-4 bg-medium-gray rounded-lg">
          <h3 className="text-body-small font-semibold text-medium-black mb-2">
            문제가 계속되나요?
          </h3>
          <ul className="text-body-small text-medium-black-secondary space-y-1 list-disc list-inside">
            <li>브라우저 쿠키가 활성화되어 있는지 확인하세요</li>
            <li>시크릿 모드나 다른 브라우저를 시도해보세요</li>
            <li>팝업 차단이 해제되어 있는지 확인하세요</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
