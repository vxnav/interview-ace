/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Dark Theme Palette */
        dark: {
          base: '#0f0f11',
          surface: '#1a1a1e',
          elevated: '#242429',
          hover: '#2e2e34',
        },
        accent: {
          primary: '#d97676',
          hover: '#e8888b',
          active: '#c85959',
          light: '#e8b4b4',
        },
        text: {
          primary: '#f5f3f0',
          secondary: '#a8a8a8',
          tertiary: '#7a7a80',
        },
        border: {
          subtle: '#3a3a42',
          normal: '#4a4a54',
        },
        status: {
          success: '#6bb896',
          warning: '#e89b6f',
          error: '#d97676',
          info: '#7eb8d9',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Roboto"', '"Oxygen"', '"Ubuntu"', '"Cantarell"', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
