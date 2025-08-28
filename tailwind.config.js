// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#2a3142',
        navyLight: '#3a4253',
        navyDark: '#1a1f2e',
        white: '#ffffff',
        gray50: '#f8fafc',
        gray100: '#f1f5f9',
        gray200: '#e2e8f0',
        gray300: '#cbd5e1',
        gray400: '#94a3b8',
        gray500: '#64748b',
        gray600: '#475569',
        gray700: '#334155',
        blue50: '#eff6ff',
        blue100: '#dbeafe',
        blue500: '#3b82f6',
        green50: '#f0fdf4',
        green100: '#dcfce7',
        green500: '#22c55e',
        green600: '#16a34a',
        red50: '#fef2f2',
        red100: '#fee2e2',
        red500: '#ef4444',
        red600: '#dc2626',
        amber50: '#fffbeb',
        amber100: '#fef3c7',
        amber500: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 24px rgba(2,8,23,0.06)',
        hover: '0 10px 30px rgba(2,8,23,0.12)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px'
      }
    }
  },
  plugins: []
}