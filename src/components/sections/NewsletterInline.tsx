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
    <section className="w-full py-16">
      {/* 🚨 max-w-7xl로 Featured와 동일한 폭 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 🚨 배경은 이 안에만 적용 + rounded-2xl */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-12">
          <div className="max-w-3xl mx-auto text-center">

            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-6">
              <Mail className="w-8 h-8 text-green-600" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              매주 최고의 인사이트를 받아보세요
            </h2>

            <p className="text-lg text-gray-600 mb-8">
              1,000+ 창업가들이 구독 중인 The Founder 뉴스레터로<br />
              매주 엄선된 창업 인사이트를 받아보세요
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                required
                disabled={status === 'loading' || status === 'success'}
                className="flex-1 px-5 py-3.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-base"
              />
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="px-8 py-3.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-base shadow-sm hover:shadow"
              >
                {status === 'loading' ? '구독 중...' : status === 'success' ? '✓ 완료!' : '구독하기 →'}
              </button>
            </form>

            {status === 'success' && (
              <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium inline-block">
                ✓ 구독이 완료되었습니다!
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium inline-block">
                ✗ 구독 중 오류가 발생했습니다. 다시 시도해주세요.
              </div>
            )}

            <p className="mt-6 text-sm text-gray-500">
              언제든지 구독을 취소할 수 있습니다. 스팸은 절대 보내지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
