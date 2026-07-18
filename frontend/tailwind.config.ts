import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Signal brand colors
        signal: {
          blue: '#3A76F0',
          'blue-dark': '#2B5BBF',
          'blue-light': '#5A8FF5',
          green: '#2AAB45',
          'green-dark': '#218A37',
          gray: '#5E5E5E',
          'gray-light': '#8E8E8E',
          'gray-lighter': '#B7B7B7',
          'gray-bg': '#F5F5F5',
          'gray-border': '#E5E5E5',
          'dark-bg': '#1B1B1B',
          'dark-surface': '#2C2C2C',
          'dark-border': '#3D3D3D',
        },
        // Message bubble colors
        message: {
          sent: '#DCF8C6',
          received: '#FFFFFF',
          'sent-dark': '#056162',
          'received-dark': '#2C2C2C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'typing-dot': 'typing 1.4s infinite ease-in-out both',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        typing: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};

export default config;