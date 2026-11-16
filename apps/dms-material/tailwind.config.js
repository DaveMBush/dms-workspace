const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [join(__dirname, 'src/**/*.{ts,html}')],
  darkMode: ['class', '.dark-theme'],
  theme: {
    extend: {
      colors: {
        'dms-primary': {
          50: 'var(--dms-primary-50)',
          100: 'var(--dms-primary-100)',
          200: 'var(--dms-primary-200)',
          300: 'var(--dms-primary-300)',
          400: 'var(--dms-primary-400)',
          500: 'var(--dms-primary-500)',
          600: 'var(--dms-primary-600)',
          700: 'var(--dms-primary-700)',
          800: 'var(--dms-primary-800)',
          900: 'var(--dms-primary-900)',
        },
        'dms-neutral': {
          50: 'var(--dms-neutral-50)',
          100: 'var(--dms-neutral-100)',
          200: 'var(--dms-neutral-200)',
          300: 'var(--dms-neutral-300)',
          400: 'var(--dms-neutral-400)',
          500: 'var(--dms-neutral-500)',
          600: 'var(--dms-neutral-600)',
          700: 'var(--dms-neutral-700)',
          800: 'var(--dms-neutral-800)',
          900: 'var(--dms-neutral-900)',
        },
        success: 'var(--dms-success)',
        warning: 'var(--dms-warning)',
        error: 'var(--dms-error)',
        info: 'var(--dms-info)',
      },
    },
  },
  plugins: [],
};
