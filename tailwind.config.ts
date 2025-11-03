import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'text-primary': 'rgba(41, 41, 41, 1)',
        'text-secondary': 'rgba(117, 117, 117, 1)',
        'text-tertiary': 'rgba(158, 158, 158, 1)',
        'bg-primary': '#ffffff',
        'bg-secondary': '#f7f7f7',
        'bg-hover': 'rgba(0, 0, 0, 0.05)',
        'accent': {
          DEFAULT: '#1a8917',
          hover: '#148a10',
        },
        'border': 'rgba(230, 230, 230, 1)',
      },
      maxWidth: {
        'container': '1192px',
        'content': '680px',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
