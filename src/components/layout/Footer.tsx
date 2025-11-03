import Link from 'next/link'

const footerSections = [
  {
    title: 'About',
    links: [
      { name: 'About us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms', href: '/terms' },
      { name: 'Privacy', href: '/privacy' },
      { name: 'Guidelines', href: '/guidelines' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-divider bg-white">
      <div className="container-site py-12">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="text-h3 font-serif font-bold text-ink-900">
                The Founder
              </span>
            </Link>
            <p className="text-small text-ink-600 max-w-xs">
              한국 1인 창업가들의 성장을 돕는 인사이트 콘텐츠 허브
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-small font-semibold text-ink-900 mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-small text-ink-600 hover:text-ink-900 no-underline hover:underline transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-divider flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-tiny text-ink-600">
            © {new Date().getFullYear()} The Founder
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <Link
              href="https://twitter.com/thefounder"
              className="text-tiny text-ink-600 hover:text-ink-900 no-underline transition-colors"
            >
              Twitter
            </Link>
            <Link
              href="https://linkedin.com/company/thefounder"
              className="text-tiny text-ink-600 hover:text-ink-900 no-underline transition-colors"
            >
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}