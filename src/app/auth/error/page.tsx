'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { AlertCircle } from 'lucide-react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');

  const getErrorInfo = (code: string | null) => {
    switch (code) {
      case 'otp_expired':
      case 'link_expired':
        return {
          title: '인증 링크가 만료되었습니다',
          description: '이메일 인증 링크는 1시간 동안만 유효합니다.',
          action: '새로운 인증 이메일을 요청해주세요.',
        };
      case 'invalid_link':
      case 'invalid_token':
        return {
          title: '유효하지 않은 링크입니다',
          description: '이미 사용된 링크이거나 잘못된 링크입니다.',
          action: '다시 가입하거나 로그인을 시도해주세요.',
        };
      case 'exchange_failed':
        return {
          title: '인증 처리 중 오류가 발생했습니다',
          description: 'OAuth 인증 코드 교환에 실패했습니다.',
          action: '브라우저 쿠키를 삭제하고 다시 시도해주세요.',
        };
      case 'missing_parameters':
        return {
          title: '잘못된 접근입니다',
          description: '필요한 인증 정보가 없습니다.',
          action: '처음부터 다시 시도해주세요.',
        };
      case 'verification_failed':
        return {
          title: '이메일 인증에 실패했습니다',
          description: errorDescription ? decodeURIComponent(errorDescription) : '인증 처리 중 오류가 발생했습니다.',
          action: '다시 시도해주세요.',
        };
      case 'already_confirmed':
        return {
          title: '이미 인증이 완료된 계정입니다',
          description: '해당 이메일은 이미 인증되었습니다.',
          action: '로그인을 시도해주세요.',
        };
      case 'access_denied':
        return {
          title: '로그인이 취소되었습니다',
          description: '사용자가 로그인을 취소했습니다.',
          action: '다시 로그인을 시도해주세요.',
        };
      case 'server_error':
        return {
          title: '서버 오류가 발생했습니다',
          description: '일시적인 서버 오류입니다.',
          action: '잠시 후 다시 시도해주세요.',
        };
      default:
        return {
          title: '로그인 오류',
          description: errorDescription ? decodeURIComponent(errorDescription) : '인증 처리 중 오류가 발생했습니다.',
          action: '다시 시도해주세요.',
        };
    }
  };

  const errorInfo = getErrorInfo(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>

          <h2 className="text-heading-2 font-serif text-medium-black text-korean">
            {errorInfo.title}
          </h2>

          <p className="mt-4 text-body text-medium-black-secondary">
            {errorInfo.description}
          </p>

          <p className="mt-2 text-body-small text-medium-black-tertiary">
            {errorInfo.action}
          </p>

          {errorCode && (
            <p className="mt-2 text-body-small text-medium-black-tertiary">
              오류 코드: {errorCode}
            </p>
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
            <li>쿠키와 캐시를 삭제한 후 다시 시도해보세요</li>
          </ul>
        </div>

        {/* Technical Details */}
        {(error || errorDescription) && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-medium-black-tertiary hover:text-medium-black transition-colors">
              기술 세부정보 보기
            </summary>
            <div className="mt-2 p-3 bg-red-50 rounded text-xs space-y-1 font-mono">
              {error && (
                <div>
                  <span className="font-semibold">Error:</span> {error}
                </div>
              )}
              {errorDescription && (
                <div className="break-all">
                  <span className="font-semibold">Description:</span>{' '}
                  {decodeURIComponent(errorDescription)}
                </div>
              )}
              {errorCode && (
                <div>
                  <span className="font-semibold">Code:</span> {errorCode}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
