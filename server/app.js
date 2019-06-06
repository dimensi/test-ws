import express from 'express'
import next from 'next'
import { createReadStream } from 'fs'
import cookieParser from 'cookie-parser'
import { createMiddleware } from './middleware'
import cacheableResponse from 'cacheable-response'
import { URL } from 'url'
import normalizeUrl from 'normalize-url'

const port = parseInt(process.env.PORT, 10) || 3000
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const options = {
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  subPaths: true,
  ignoreRoutes: ['_next', 'static'],
}

const hoursToMs = hours => 1e3 * 60 ** 2 * hours
const removeQuery = (url) => url.replace(/\?.+/, '')

const ssrCache = cacheableResponse({
  ttl: hoursToMs(1),
  get: async ({ req, res, url, query }) => {
    return {
      data: await app.renderToHTML(req, res, url || removeQuery(req.url), query || req.query),
    }
  },
  getKey: req => {
    const url = new URL(req.originalUrl, 'http://localhost')
    const { origin } = url
    const baseKey = normalizeUrl(url.toString(), {
      removeQueryParameters: [/^utm_\w+/i, 'force', 'filter', 'ref'],
    })
    return baseKey.replace(origin, '').replace('/?', '') || '/'
  },
  send: ({ data, res }) => res.send(data),
})

async function start () {
  await app.prepare()
  const server = express()
  server.disable('x-powered-by')
  if (process.env.PROXY === 'true') {
    server.set('trust proxy', true)
  }
  server.use(cookieParser())

  server.get('/favicon.ico', (req, res) => {
    res.append('Content-Type', 'image/x-icon')
    return createReadStream('./static/icons/favicon.ico').pipe(res)
  })

  server.use(createMiddleware(options))

  server.use((req, res, next) => {
    if (req.lingui) {
      req.lingui.url = {
        origin: `${req.protocol}://${req.hostname}`,
        pathname: req.url,
      }
    }
    next()
  })

  server.get('/pressRelease/:slug', (req, res) => {
    if (dev) {
      return app.render(req, res, '/pressRelease', { ...req.query, slug: req.params.slug })
    }
    return app.render(req, res, '/pressRelease', { ...req.query, slug: req.params.slug })
  })

  server.get('/media', (req, res) => {
    return app.render(req, res, '/media', req.query)
  })

  server.get('*', (req, res) => {
    if (dev) {
      return handle(req, res)
    }

    if (req.url.includes('_next/') || req.url.includes('static/')) {
      return handle(req, res)
    }

    return ssrCache({ req, res })
  })

  await server.listen(port)
  return port
}

start().then((port) => {
  console.log(`> Ready on http://localhost:${port}`)
})
