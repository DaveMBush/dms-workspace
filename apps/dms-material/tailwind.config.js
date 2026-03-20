const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [join(__dirname, 'src/**/*.{ts,html}')],
  darkMode: ['class', '.dark-theme'],
  theme: {
    extend: {},
  },
  plugins: [],
};
