import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)']
      },
      colors: {
        ink: '#0f172a',
        slate: '#1f2937',
        electric: '#2dd4ff'
      }
    }
  },
  plugins: []
};

export default config;
