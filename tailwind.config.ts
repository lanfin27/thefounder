import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Medium Typography
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Medium's exact sizes
        'hero': ['56px', { lineHeight: '64px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['42px', { lineHeight: '52px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body': ['21px', { lineHeight: '32px', fontWeight: '400' }],      // Medium's signature
        'subtitle': ['20px', { lineHeight: '28px', fontWeight: '400' }],
        'caption': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'tiny': ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },
      colors: {
        // Medium Grayscale
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
        // Brand Green
        'green': {
          primary: '#1a8917',
          hover: '#148a10',
          light: '#e9fce8',
        },
        // Border & Divider
        'border': {
          subtle: 'rgba(0, 0, 0, 0.05)',
          light: 'rgba(0, 0, 0, 0.1)',
          medium: 'rgba(0, 0, 0, 0.15)',
        },
        'divider': 'rgba(0, 0, 0, 0.08)',
      },
      maxWidth: {
        'article': '680px',      // Article body
        'content': '728px',      // With padding
        'container': '900px',    // Lists
        'site': '1192px',        // Site max
      },
      spacing: {
        '15': '60px',
        '18': '72px',
        '22': '88px',
        '26': '104px',
        '30': '120px',
      },
      borderRadius: {
        'sm': '3px',
        'DEFAULT': '4px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 4px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
