import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-medium-gray-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Logo and tagline */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-medium-black tracking-tight">
                The Founder
              </h3>
            </Link>
            <p className="mt-2 text-body-small text-medium-black-secondary text-korean">
              한국 스타트업 생태계의 깊이 있는 인사이트
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-8">
            <Link href="/posts" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              블로그
            </Link>
            <Link href="/posts?category=뉴스레터" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              뉴스레터
            </Link>
            <Link href="/posts?category=SaaS" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              SaaS
            </Link>
            <Link href="/posts?category=창업" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              창업
            </Link>
            <Link href="/membership" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              멤버십
            </Link>
            <Link href="/about" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              소개
            </Link>
            <Link href="/contact" className="text-body-small text-medium-black-secondary hover:text-medium-black transition-colors">
              문의
            </Link>
          </div>

          {/* Bottom section */}
          <div className="text-center pt-8 border-t border-medium-gray-border">
            <p className="text-caption text-medium-black-tertiary">
              &copy; {new Date().getFullYear()} The Founder. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}