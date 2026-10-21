/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { 900: '#0a1220', 800: '#0e1a2e', 700: '#13233b', 600: '#1a2f4d' },
        line: '#22395a',
        ink: '#e6eef9',
        mute: '#8aa0bf',
        accent: '#22d3ee',
        teal: '#2dd4bf',
        ok: '#34d399',
        warn: '#fbbf24',
        bad: '#f87171',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      keyframes: {
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
        drift: {
          '0%,100%': { transform: 'translate(0,0)' },
          '25%': { transform: 'translate(34px,18px)' },
          '50%': { transform: 'translate(60px,-10px)' },
          '75%': { transform: 'translate(20px,-30px)' },
        },
      },
      animation: { pulseSoft: 'pulseSoft 1.4s ease-in-out infinite', drift: 'drift 14s ease-in-out infinite' },
    },
  },
  plugins: [],
};
