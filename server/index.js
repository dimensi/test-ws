const dotenv = require('dotenv')
if (dotenv.config().error) {
  console.error("Can't load env configuration")
  process.exit()
}
require = require('esm')(module) //eslint-disable-line
module.exports = require('./app.js')
