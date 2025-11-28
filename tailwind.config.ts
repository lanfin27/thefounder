import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // 모든 폰트를 시스템 폰트로 통일
        sans: [
          'var(--font-pretendard)',
          'Pretendard',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'sans-serif',
        ],
        // Serif도 Sans로 통일 (낭만파트너스 스타일)
        serif: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          'sans-serif',
        ],
      },
      fontSize: {
        'h1': ['44px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body': ['21px', { lineHeight: '32px', fontWeight: '400' }],
        'caption': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'tiny': ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },
      colors: {
        'ink': {
          950: '#000000',
          900: '#121212',
          800: '#242424',
          700: '#6B6B6B',
          600: '#757575',
          500: '#8D8D8D',
          400: '#B3B3B3',
          300: '#CCCCCC',
          200: '#E6E6E6',
          100: '#F2F2F2',
          50: '#FAFAFA',
        },
        'green': {
          primary: '#1a8917',
          hover: '#148a10',
          light: '#e9fce8',
        },
        'divider': 'rgba(0, 0, 0, 0.08)',
      },
      maxWidth: {
        'article': '680px',
        'content': '728px',
        'container': '900px',
        'site': '1192px',
      },
    },
  },
  plugins: [],
}

export default config
