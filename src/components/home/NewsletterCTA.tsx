'use client';

import { useState, FormEvent } from 'react';

export function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) return;

    setStatus('loading');
    setMessage('');

    // TODO: 실제 Newsletter API 연동
    // 현재는 시뮬레이션
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus('success');
      setMessage('구독이 완료되었습니다!');
      setEmail('');

      // 3초 후 상태 초기화
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage('오류가 발생했습니다. 다시 시도해주세요.');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  return (
    <section id="newsletter" className="py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* 아이콘 */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* 제목 */}
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          매주 인사이트를 받아보세요
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          1인 창업가를 위한 엄선된 콘텐츠를 이메일로 전달합니다
        </p>

        {/* 이메일 폼 */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소를 입력하세요"
              required
              disabled={status === 'loading'}
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="이메일 주소"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap hover:shadow-lg"
            >
              {status === 'loading' ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  구독 중...
                </span>
              ) : (
                '구독하기'
              )}
            </button>
          </div>

          {/* 상태 메시지 */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                status === 'success'
                  ? 'bg-green-500/20 text-white'
                  : 'bg-red-500/20 text-red-100'
              }`}
              role="alert"
            >
              {status === 'success' ? '✅' : '❌'} {message}
            </div>
          )}
        </form>

        {/* 개인정보 안내 */}
        <p className="mt-6 text-sm text-blue-200">
          언제든지 구독을 취소할 수 있습니다. 개인정보는 안전하게 보호됩니다.
        </p>
      </div>
    </section>
  );
}