import pathMatch from 'path-match'

const path = pathMatch()

const getQuery = url => {
  const idx = url.indexOf('?')
  if (idx === -1) {
    return ''
  }
  return url.substr(idx)
}
/**
 *
 * @param {object} options
 * @param {import('next').Server} nextApp
 * @returns {import('express').Handler[]}
 */
export function createMiddleware ({ locales, defaultLocale, subPaths, ignoreRoutes }) {
  const localesWithoutDefault = () => locales.filter(lang => lang !== defaultLocale)
  const getPathWithTrallingSlash = path =>
    localesWithoutDefault().some(lng => path === `/${lng}`) ? `${path}/` : path
  const ignoreRegex = new RegExp(`^/(?!${ignoreRoutes.map(x => x.replace('/', '')).join('|')}).*$`)
  const ignoreRoute = path(ignoreRegex)
  const isI18nRoute = req => ignoreRoute(req.url) && req.method === 'GET'
  const routeWithLang = path(`/:lang(${localesWithoutDefault().join('|')})?/*`)
  const parseRoute = pathname => routeWithLang(pathname)
  /**
   * @type {import('express').Handler[]}
   */
  const middlewares = []

  middlewares.push((req, res, next) => {
    req.lingui = {
      locale: req.cookies.locale || req.acceptsLanguages(locales) || defaultLocale,
      locales,
      defaultLocale,
    }
    next()
  })

  if (subPaths) {
    middlewares.push((req, res, next) => {
      if (!isI18nRoute(req)) return next()
      const savedPath = req.path
      const pathname = getPathWithTrallingSlash(req.path)
      const { lang, 0: otherPath } = parseRoute(pathname)
      const {
        lingui: { locale: userLocale },
      } = req
      const query = getQuery(req.url)
      req.url = `/${otherPath || ''}`
      req.url = req.url + query
      if (userLocale === defaultLocale && lang == null) {
        return next()
      }

      if (userLocale === defaultLocale && lang != null) {
        return res.redirect(`/${otherPath || ''}${query}`)
      }

      if (userLocale === lang && !otherPath && !/\/$/.test(savedPath)) {
        return res.redirect(pathname + query)
      }

      if (userLocale === lang) {
        return next()
      }

      return res.redirect(`/${userLocale}${otherPath ? `/${otherPath}` : ''}${query}`)
    })
  }

  return middlewares
}
