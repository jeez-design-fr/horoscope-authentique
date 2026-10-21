/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './generator.js',
    './lib/**/*.js',
    './content/**/*.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        // Deux familles pour tout le site, y compris les anciennes pages
        sans: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        cinzel: ['Cinzel', '"Cormorant Garamond"', 'serif']
      }
    },
  },
  plugins: [],
}
