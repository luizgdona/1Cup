import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        espresso:  { DEFAULT: '#26170C', deep: '#1D1C1D' },
        caramel:   '#7D562D',
        gold:      { DEFAULT: '#FFC000', dark: '#FFD54F' },
        latte:     '#E9EDC9',
        paper:     { DEFAULT: '#FDF8F5', warm: '#F8F3F0' },
        crema:     '#FFFFFF',
        // dark surfaces
        'dark-bg':   '#141210',
        'dark-surf': '#1C1A18',
        'dark-var':  '#2E2A27',
        'dark-text': '#DEC1AF',
        'dark-sub':  '#D2C4BC',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'warm-sm': '0 1px 2px rgba(38,23,12,0.08)',
        'warm-md': '0 4px 12px rgba(38,23,12,0.12)',
        'warm-lg': '0 8px 24px rgba(38,23,12,0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
