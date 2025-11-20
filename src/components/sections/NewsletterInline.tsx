'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export function NewsletterInline() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if duplicate subscription
        if (response.status === 409 && data.alreadySubscribed) {
          alert('이미 구독 중입니다.');
          setStatus('idle');
          return;
        }

        // Other errors
        throw new Error(data.error || '구독 중 오류가 발생했습니다.');
      }

      // Success
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      alert(error instanceof Error ? error.message : '구독 중 오류가 발생했습니다.');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <section className="w-full py-8 md:py-16">
      {/* 🚨 max-w-7xl로 Featured와 동일한 폭 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 🚨 배경은 이 안에만 적용 + rounded-2xl */}
        <div className="bg-green-50 md:bg-gradient-to-br md:from-green-50 md:to-emerald-50 rounded-2xl p-6 md:p-12">
          <div className="max-w-3xl mx-auto text-center">

            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white rounded-full shadow-sm mb-4 md:mb-6">
              <Mail className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            </div>

            <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
              {/* Mobile: 간결한 문구 */}
              <span className="block md:hidden">
                매주 최고의 1인 창업 인사이트를 받아보세요
              </span>
              {/* PC: 기존 문구 유지 */}
              <span className="hidden md:block">
                매주 최고의 인사이트를 받아보세요
              </span>
            </h2>

            <p className="text-lg text-gray-600 mb-6 md:mb-8">
              {/* Mobile: 숨김 */}
              <span className="block md:hidden">
                {/* 모바일에서는 본문 숨김 */}
              </span>
              {/* PC: 수정된 문구 */}
              <span className="hidden md:block">
                1,000+ 1인 창업가들이 구독 중인 The Founder 뉴스레터<br />
              </span>
            </p>

            <form onSubmit={handleSubmit} className="relative flex items-center max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                required
                disabled={status === 'loading' || status === 'success'}
                className="w-full pl-6 pr-14 py-3 md:py-4 rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm md:text-base shadow-sm"
              />
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="absolute right-2 p-2 bg-green-600 text-white rounded-full hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                aria-label="구독하기"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : status === 'success' ? (
                  <span className="text-white font-bold">✓</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                )}
              </button>
            </form>

            {status === 'success' && (
              <div className="mt-4 text-green-600 text-sm font-medium">
                ✓ 구독이 완료되었습니다!
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 text-red-600 text-sm font-medium">
                ✗ 구독 중 오류가 발생했습니다. 다시 시도해주세요.
              </div>
            )}

            <p className="mt-6 text-xs md:text-sm text-gray-400 md:text-gray-500">
              언제든지 구독을 취소할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
