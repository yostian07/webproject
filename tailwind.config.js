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
    extend: {},
  },
  variants: {
    extend: {
      backgroundColor: ['dark'],
      borderColor: ['dark'],
    },
  },
  plugins: [],
};
