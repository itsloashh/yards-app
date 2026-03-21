/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        yard: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      keyframes: {
        fadeUp: { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        slideDown: { from: { transform: 'translateY(-100%)' }, to: { transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        pulseRing: { '0%': { transform: 'scale(0.8)', opacity: '0.6' }, '100%': { transform: 'scale(2.2)', opacity: '0' } },
        dropIn: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        dropPin: { '0%': { opacity: '0', transform: 'translateY(-20px) scale(0.5)' }, '60%': { transform: 'translateY(4px) scale(1.1)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out both',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'drop-in': 'dropIn 0.2s ease-out',
        'drop-pin': 'dropPin 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
