/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {

        // Основные цвета приложения
        main: {
          'surface-primary': '#212121',
          'surface-secondary': '#2f2f2f',
        },

        typo: {
          'secondary': '#b4b4b4'
        },

        sidebar: {
          'surface-primary': '#171717',
          'surface-secondary': '#212121',
        },

        // Цвета различных компонентов
        green: {
          500: '#01796F',
        },


      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
  variants: {
    scrollbar: [
      'rounded'
    ]
  }
}
