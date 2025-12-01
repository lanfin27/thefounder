'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-serif font-bold text-medium-black">
            The Founder
          </Link>
          <h2 className="mt-6 text-heading-2 font-serif text-medium-black">
            이메일 확인
          </h2>
          {email && (
            <p className="mt-2 text-body-small text-medium-black-secondary">
              <span className="font-medium text-medium-black">{email}</span>로<br />
              인증 링크를 발송했습니다
            </p>
          )}
        </div>

        {/* Email Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-medium-green/10 rounded-full flex items-center justify-center">
            <Mail className="w-10 h-10 text-medium-green" />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-medium-gray rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-medium-black text-center">
            이메일을 확인해주세요
          </h3>
          <ul className="space-y-3 text-body-small text-medium-black-secondary">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-medium-green/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-medium-green">1</span>
              </div>
              <span>이메일에서 <strong className="text-medium-black">"Log In"</strong> 버튼을 클릭하세요</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-medium-green/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-medium-green">2</span>
              </div>
              <span>자동으로 로그인됩니다</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-medium-green/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-medium-green">3</span>
              </div>
              <span>신규 가입자는 프로필 설정 페이지로 이동합니다</span>
            </li>
          </ul>
        </div>

        {/* Success indicator */}
        <div className="flex items-center justify-center gap-2 text-body-small text-medium-green">
          <CheckCircle className="w-4 h-4" />
          <span>이메일이 성공적으로 발송되었습니다</span>
        </div>

        {/* Back Link */}
        <div className="text-center space-y-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center text-body-small text-medium-black-secondary hover:text-medium-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            로그인 페이지로 돌아가기
          </Link>
        </div>

        {/* Tips */}
        <div className="pt-6 border-t border-medium-gray-border">
          <p className="text-xs text-medium-black-tertiary text-center mb-3">
            💡 이메일이 보이지 않나요?
          </p>
          <ul className="text-xs text-medium-black-tertiary space-y-1.5">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>스팸 폴더를 확인해주세요</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>이메일 주소가 정확한지 확인해주세요</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>몇 분 정도 소요될 수 있습니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>인증 링크는 1시간 동안 유효합니다</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}