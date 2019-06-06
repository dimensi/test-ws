const path = require('path')

module.exports = {
  resolve: {
    alias: {
      '@': __dirname,
      src: path.join(__dirname, 'src'),
    },
  },
}
