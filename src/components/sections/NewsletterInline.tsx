'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export function NewsletterInline() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // TODO: Newsletter signup API
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <section className="w-full bg-gradient-to-br from-green-50 to-emerald-50 py-16">
      {/* 🚨 중요: max-w-7xl로 Featured와 동일한 폭 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">

          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-6">
            <Mail className="w-8 h-8 text-green-600" />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            매주 최고의 인사이트를 받아보세요
          </h2>

          {/* Subheading */}
          <p className="text-lg text-gray-600 mb-8">
            1,000+ 창업가들이 구독 중인 The Founder 뉴스레터로<br />
            매주 엄선된 창업 인사이트를 받아보세요
          </p>

          {/* Form - max-w-xl로 Featured 폭과 조화 */}
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

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium inline-block">
              ✓ 구독이 완료되었습니다!
            </div>
          )}

          {/* Privacy Notice */}
          <p className="mt-6 text-sm text-gray-500">
            언제든지 구독을 취소할 수 있습니다. 스팸은 절대 보내지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
