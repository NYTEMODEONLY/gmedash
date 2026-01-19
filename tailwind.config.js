/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GameStop Brand Colors
        'gme-red': '#E31837',
        'gme-red-dark': '#C41230',
        'gme-red-light': '#FF1F43',

        // Dark Theme Colors
        'gme-black': '#000000',
        'gme-dark': '#0a0a0a',
        'gme-dark-100': '#111111',
        'gme-dark-200': '#1a1a1a',
        'gme-dark-300': '#222222',
        'gme-dark-400': '#2a2a2a',
        'gme-dark-500': '#333333',

        // Light Theme Colors
        'gme-light': '#ffffff',
        'gme-light-100': '#f8f9fa',
        'gme-light-200': '#f1f3f5',
        'gme-light-300': '#e9ecef',

        // Stock Colors
        'stock-green': '#00C853',
        'stock-green-dark': '#00A844',
        'stock-red': '#FF1744',
        'stock-red-dark': '#D50000',

        // Accent Colors
        'accent-blue': '#2196F3',
        'accent-yellow': '#FFC107',
        'accent-orange': '#FF9800',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(227, 24, 55, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(227, 24, 55, 0.8)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gme-gradient': 'linear-gradient(135deg, #E31837 0%, #C41230 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
      },
    },
  },
  plugins: [],
}
