module.exports = {
  purge: {
    content: [
      './public/**/*.html',
      './public/assets/css/**/*.css',
      './public/scripts/**/*.js',
    ],
    safelist: [
      'bg-gray-300',
      'dark:bg-gray-400',
      'border-b',
      'dark:border-gray-400',
    ],
  },
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'shine-pulse': {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
      },
      animation: {
        'shine-border': 'shine-pulse 3s linear infinite',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['dark'],
      borderColor: ['dark'],
    },
  },
  plugins: [],
};
