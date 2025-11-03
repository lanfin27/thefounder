'use client';

import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';

export function NewsletterInline() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // API 호출 로직 추가
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock
      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 px-6 bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-[800px] mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-primary/10 mb-6">
          <Mail className="h-8 w-8 text-green-primary" />
        </div>

        <h2 className="text-3xl lg:text-4xl font-bold text-ink-900 mb-4">
          매주 최고의 인사이트를 받아보세요
        </h2>

        <p className="text-lg text-ink-700 mb-8 max-w-2xl mx-auto">
          1,000+ 창업가들이 구독 중인 The Founder 뉴스레터로
          <br className="hidden sm:block" />
          매주 엄선된 창업 인사이트를 받아보세요
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          {status === 'success' ? (
            <div className="p-4 bg-green-primary/10 text-green-primary rounded-xl text-sm font-medium">
              ✨ 구독해주셔서 감사합니다! 이메일을 확인해주세요.
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소를 입력하세요"
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-ink-200 focus:border-green-primary focus:outline-none transition-colors text-base"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-4 bg-green-primary text-white rounded-xl font-medium hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {isSubmitting ? '처리중...' : '구독하기'}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm text-red-600">
              오류가 발생했습니다. 다시 시도해주세요.
            </p>
          )}
        </form>

        <p className="mt-4 text-sm text-ink-600">
          언제든지 구독을 취소할 수 있습니다. 스팸은 절대 보내지 않습니다.
        </p>
      </div>
    </section>
  );
}
