import Link from 'next/link'
import { Twitter, Linkedin, Github, Mail } from 'lucide-react'

const footerSections = [
  {
    title: '콘텐츠',
    links: [
      { label: '트렌드', href: '/trend' },
      { label: '인사이트', href: '/insight' },
      { label: '사례', href: '/casestudy' },
      { label: '블로그', href: '/blog' },
    ],
  },
  {
    title: '서비스',
    links: [
      { label: '멤버십', href: '/membership' },
      { label: '뉴스레터', href: '/newsletter' },
      { label: '밸류에이션', href: '/valuation' },
    ],
  },
  {
    title: '회사',
    links: [
      { label: '소개', href: '/about' },
      { label: '문의', href: '/contact' },
      { label: '채용', href: '/careers' },
    ],
  },
  {
    title: '법적 고지',
    links: [
      { label: '이용약관', href: '/terms' },
      { label: '개인정보처리방침', href: '/privacy' },
    ],
  },
]

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/thefounder', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/thefounder', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/thefounder', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@thefounder.kr', label: 'Email' },
]

export default function Footer() {
  return (
    <footer className="bg-surface-50 border-t border-border-100">
      <div className="container mx-auto px-4 max-w-container py-section">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-body-sm font-semibold text-ink-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-ink-500 hover:text-ink-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border-100 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Logo and Copyright */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <Link href="/">
                <h3 className="text-h3 font-bold text-ink-900">
                  The Founder
                </h3>
              </Link>
              <p className="text-body-sm text-ink-500">
                © {new Date().getFullYear()} The Founder. All rights reserved.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-500 hover:text-ink-900 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}