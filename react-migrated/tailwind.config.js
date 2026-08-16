/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', '"Plus Jakarta Sans"', 'Montserrat', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

