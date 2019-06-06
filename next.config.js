require('dotenv').config()
const withPlugins = require('next-compose-plugins')
const sass = require('@zeit/next-sass')
const css = require('@zeit/next-css')
const optimizedImages = require('next-optimized-images')
const fonts = require('next-fonts')
const bundleAnalyzer = require('@zeit/next-bundle-analyzer')
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin')
const Dotenv = require('dotenv-webpack')
const path = require('path')

module.exports = withPlugins(
  [
    [fonts],
    [css],
    [
      sass,
      {
        cssModules: true,
        cssLoaderOptions: {
          localIdentName: '[name]__[local]___[hash:base64:5]',
        },
        sassLoaderOptions: {
          includePaths: [
            path.join(__dirname, '/src/assets/styles/'),
            path.join(__dirname, '/node_modules/'),
          ],
          data: '@import "variables.scss";',
        },
      },
    ],
    [
      optimizedImages,
      {
        inlineImageLimit: -1,
      },
    ],
    [
      bundleAnalyzer,
      {
        analyzeServer: ['server', 'both'].includes(process.env.BUNDLE_ANALYZE),
        analyzeBrowser: ['browser', 'both'].includes(process.env.BUNDLE_ANALYZE),
        bundleAnalyzerConfig: {
          server: {
            analyzerMode: 'static',
            reportFilename: '../.next/server.html',
          },
          browser: {
            analyzerMode: 'static',
            reportFilename: '../.next/client.html',
          },
        },
      },
    ],
  ],
  {
    poweredByHeader: false,
    webpack: (config, { isServer, dev }) => {
      if (!isServer && !dev) {
        config.optimization.splitChunks.cacheGroups.vendors = {
          name: 'lodash',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](lodash|lodash-es)[\\/]/,
        }
        config.optimization.splitChunks.cacheGroups.forms = {
          name: 'forms',
          chunks: 'all',
          test: /[\\/]node_modules[\\/](yup|formik)[\\/]/,
        }
      }
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['@catalogs$'] = path.resolve(
        __dirname,
        isServer ? './src/locales/catalogs.server.js' : './src/locales/catalogs.client.js'
      )
      config.plugins.push(
        new FilterWarningsPlugin({
          exclude: /mini-css-extract-plugin[^]*Conflicting order between:/,
        })
      )
      config.plugins.push(
        new Dotenv({
          path: path.join(__dirname, '.env'),
        })
      )
      return config
    },
  }
)
