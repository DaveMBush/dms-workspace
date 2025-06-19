/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./apps/rms/src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwindcss-primeui')
  ],
}
