import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Medium-inspired color palette
        medium: {
          black: 'rgba(0, 0, 0, 0.84)',
          'black-secondary': 'rgba(0, 0, 0, 0.54)',
          'black-tertiary': 'rgba(0, 0, 0, 0.38)',
          green: '#1a8917',
          'green-dark': '#0f6d0c',
          'green-light': 'rgba(26, 137, 23, 0.1)',
          gray: '#f7f7f7',
          'gray-border': 'rgba(0, 0, 0, 0.1)',
        },
        // Keep founder colors for potential use
        founder: {
          primary: '#1a8917',
          secondary: '#4ECDC4',
          dark: '#1A1A2E',
          gray: '#F5F5F5',
        },
      },
      fontFamily: {
        // Medium-inspired font stack with Apple Korea optimization
        sans: [
          'Charter',
          'Georgia',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          '-apple-system',
          'BlinkMacSystemFont',
          'Malgun Gothic',
          '맑은 고딕',
          'system-ui',
          'Helvetica Neue',
          'sans-serif',
        ],
        serif: [
          'Charter',
          'Georgia',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'serif',
        ],
        mono: [
          'Menlo',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        // Custom font sizes for Medium-style typography
        'heading-1': ['42px', { lineHeight: '1.25', letterSpacing: '-0.03em' }],
        'heading-2': ['34px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        'heading-3': ['24px', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
        'heading-4': ['20px', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        'body-large': ['21px', { lineHeight: '1.58', letterSpacing: '-0.003em' }],
        'body-medium': ['18px', { lineHeight: '1.6', letterSpacing: '-0.002em' }],
        'body-small': ['16px', { lineHeight: '1.5', letterSpacing: '-0.001em' }],
        'caption': ['14px', { lineHeight: '1.4' }],
      },
      spacing: {
        // Container widths
        'container-sm': '680px',
        'container-md': '960px',
        'container-lg': '1192px',
      },
      borderRadius: {
        'medium': '4px',
      },
      boxShadow: {
        'card': '0 1px 4px rgba(0, 0, 0, 0.12)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'button': '0 2px 8px rgba(26, 137, 23, 0.3)',
      },
      transitionDuration: {
        'medium': '200ms',
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config