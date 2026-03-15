/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#020614',
          900: '#0A0E27',
          800: '#1A1F3A',
          700: '#2D3561',
          600: '#4A5899',
          500: '#6B7FD7',
        },
        neon: {
          cyan: '#00F5FF',
          purple: '#B24BF3',
          pink: '#FF2E97',
          green: '#00FF88',
          orange: '#FF6B35',
          yellow: '#FFD93D',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #00F5FF, 0 0 10px #00F5FF' },
          '50%': { boxShadow: '0 0 20px #00F5FF, 0 0 40px #00F5FF, 0 0 60px #00F5FF' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'glow': {
          '0%': { textShadow: '0 0 10px #00F5FF' },
          '100%': { textShadow: '0 0 20px #00F5FF, 0 0 40px #00F5FF' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(107 127 215 / 0.15)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
      },
    },
  },
  plugins: [],
};
