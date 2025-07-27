import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold text-founder-primary">
              The Founder
            </Link>
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">
              한국 스타트업 생태계의 깊이 있는 인사이트와<br />
              창업가들의 진솔한 이야기를 전합니다.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              카테고리
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/posts?category=뉴스레터" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  뉴스레터
                </Link>
              </li>
              <li>
                <Link href="/posts?category=SaaS" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  SaaS
                </Link>
              </li>
              <li>
                <Link href="/posts?category=블로그" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  블로그
                </Link>
              </li>
              <li>
                <Link href="/posts?category=창업" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  창업
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              서비스
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/membership" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  프리미엄 멤버십
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  소개
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-founder-primary transition-colors">
                  문의
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} The Founder. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}