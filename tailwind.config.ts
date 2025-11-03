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
        primary: {
          900: '#0a4d09',
          800: '#0f6d0c',
          700: '#148a10',
          600: '#1a8917',
          500: '#1fa813',
          400: '#4cbf49',
          300: '#79d677',
          200: '#a6eda5',
          100: '#d3f9d2',
          50: '#e9fce8',
        },
        ink: {
          900: 'rgba(0, 0, 0, 0.84)',
          700: 'rgba(0, 0, 0, 0.64)',
          500: 'rgba(0, 0, 0, 0.54)',
          400: 'rgba(0, 0, 0, 0.38)',
        },
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f7f7f7',
        },
        border: {
          100: 'rgba(0, 0, 0, 0.06)',
          200: 'rgba(0, 0, 0, 0.1)',
        },
        semantic: {
          success: '#1a8917',
          error: '#e53e3e',
          warning: '#ed8936',
          info: '#3182ce',
        }
      },
      fontSize: {
        'h1': ['44px', { lineHeight: '56px', letterSpacing: '-0.02em' }],
        'h2': ['32px', { lineHeight: '42px' }],
        'h3': ['22px', { lineHeight: '30px' }],
        'body-lg': ['18px', { lineHeight: '30px', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '22px', fontWeight: '400' }],
      },
      maxWidth: {
        'container': '1200px',
      },
      spacing: {
        'section-sm': '64px',
        'section': '80px',
        'section-lg': '96px',
      },
      animation: {
        'elevation-in': 'elevation-in 200ms ease-out',
        'hover-lift': 'hover-lift 120ms ease-out',
      },
      keyframes: {
        'elevation-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'hover-lift': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
