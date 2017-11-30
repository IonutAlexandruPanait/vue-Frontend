const fs = require('fs')
const path = require('path')
const LRU = require('lru-cache')
const express = require('express')
var cookieParser = require('cookie-parser');
const favicon = require('serve-favicon')
const compression = require('compression')
const resolve = file => path.resolve(__dirname, file)
const { createBundleRenderer } = require('vue-server-renderer')



const isProd = process.env.NODE_ENV === 'production'
const useMicroCache = process.env.MICRO_CACHE !== 'false'
const serverInfo =
  `express/${require('express/package.json').version} ` +
  `vue-server-renderer/${require('vue-server-renderer/package.json').version}`

const app = express()

const template = fs.readFileSync(resolve('./src/index.template.html'), 'utf-8')

function createRenderer (bundle, options) {
  // https://github.com/vuejs/vue/blob/dev/packages/vue-server-renderer/README.md#why-use-bundlerenderer
  return createBundleRenderer(bundle, Object.assign(options, {
    template,
    // for component caching
    cache: LRU({
      max: 1000,
      maxAge: 1000 * 60 * 15
    }),
    // this is only needed when vue-server-renderer is npm-linked
    basedir: resolve('./dist'),
    // recommended for performance
    runInNewContext: false
  }))
}

let renderer
let readyPromise
if (isProd) {
  // In production: create server renderer using built server bundle.
  // The server bundle is generated by vue-ssr-webpack-plugin.
  const bundle = require('./dist/vue-ssr-server-bundle.json')
  // The client manifests are optional, but it allows the renderer
  // to automatically infer preload/prefetch links and directly add <script>
  // tags for any async chunks used during render, avoiding waterfall requests.
  const clientManifest = require('./dist/vue-ssr-client-manifest.json')
  renderer = createRenderer(bundle, {
    clientManifest
  })
} else {
  // In development: setup the dev server with watch and hot-reload,
  // and create a new renderer on bundle / index template update.
  readyPromise = require('./build/setup-dev-server')(app, (bundle, options) => {
    renderer = createRenderer(bundle, options)
  })
}

const serve = (path, cache) => express.static(resolve(path), {

  maxAge: cache && isProd ? 1000 * 60 * 60 * 24 * 30 : 0
})

app.use(compression({ threshold: 0 }))
app.use(cookieParser()); // cookie parser
app.use(favicon('./public/logo-48.png'))
app.use('/dist', serve('./dist', true))
app.use('/public', serve('./public', true))
app.use('/manifest.json', serve('./manifest.json', true))
app.use('/service-worker.js', serve('./dist/service-worker.js'))


//starting the SocketWorkerService
// var ServerSocketWorkerService = require('./src/services/communication/server-socket-worker/ServerSocketWorker.service.js');
// console.log(ServerSocketWorkerService);

// 1-second microcache.
// https://www.nginx.com/blog/benefits-of-microcaching-nginx/
const microCache = LRU({
  max: 100,
  maxAge: 1000
})

// since this app has no user-specific content, every page is micro-cacheable.
// if your app involves user-specific content, you need to implement custom
// logic to determine whether a request is cacheable based on its url and
// headers.
const isCacheable = req => useMicroCache

function render (req, res) {
  const s = Date.now()

  res.setHeader("Content-Type", "text/html")
  res.setHeader("Server", serverInfo)

  const handleError = err => {
    if (err.url) {
      res.redirect(err.url)
    } else if(err.code === 404) {
      res.status(404).end('404 | Page Not Found')
    } else {
      // Render Error Page or Redirect
      res.status(500).end('500 | Internal Server Error')
      console.error(`error during render : ${req.url}`)
      console.error(err.stack)
    }
  }

  const cacheable = isCacheable(req)
  if (cacheable) {
    const hit = microCache.get(req.url)
    if (hit) {
      if (!isProd) {
        console.log(`cache hit!`)
      }
      return res.end(hit)
    }
  }

  //EXTRACTING THE IP
   let ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
   //const requestIp = require('request-ip');
   //let ip = requestIp.getClientIp(req);
   console.log('IP::'); console.log(ip);

  const context = {
    SEOMixinTitle: {
      title:'WebDollar - Web Coin of the Internet',
      facebook: 'WebDollar - Web Coin of the Internet',
      twitter: 'WebDollar - Web Coin of the Internet',
    }, // default title
    SEOMixinDescription: {
      description:'WebDollar - disrupting Blockchain',
      facebook:'WebDollar - disrupting Blockchain',
      twitter: 'WebDollar - disrupting Blockchain', // default title
    },
    SEOMixinKeywords: 'webdollar, blockchain, bitcoin, blockchain in browser',
    SEOMixinImages:
      '<meta property="og:image"  content="http://webdollar.io/public/images/WebDollar-Landing-image.png"  /> ' +
      '<meta property="og:image:alt" content="WebDollar - Currency of Internet" />' +
      '<meta property="twitter:image"  content="http://webdollar.io/public/images/WebDollar-Landing-image.png" />'+
      '<meta property="twitter:image:alt" content="WebDollar - Currency of the Internet"   />',
    SEOMixinSchemaMarkup:{
        "@context": "http://schema.org",
        "@type": "WebSite",
        name: "SkyHub",
        alternateName: "SkyHub Forum Social Network",
        url: "http://skyub.me/",
        potentialAction: {
            "@type": "SearchAction",
            target: "http://skyhub.me/search/{query}",
            "query-input": "required"
        }
    },
    SEOMixinBreadcrumbsSchemaMarkup:{
        "@context": "http://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [{
            "@type": "ListItem",
            position: 1,
            item: {
                "@id": "https://webolldar.io/",
                name: "Home",
                image: "http://webdollar.io/public/WebDollar-logo.jpg"
            }
        }],
    },
    SEOMixinWebPageType: 'website',
    SEOMixinCopyright: 'WebDollar',
    SEOMixinLanguage: 'en-US',
    pageType: 'article',

    cookies: req.cookies,   //signedCookies instead
    ip: ip,   //the ip
    url: req.url
  };

  renderer.renderToString(context, (err, html) => {
    if (err) {
      return handleError(err)
    }
    res.end(html)
    if (cacheable) {
      microCache.set(req.url, html)
    }
    if (!isProd) {
      console.log(`whole request: ${Date.now() - s}ms`)
    }
  })
}

app.get('*', isProd ? render : (req, res) => {
  readyPromise.then(() => render(req, res))
})

const port = process.env.PORT || 80
app.listen(port, () => {
  console.log(`server started at localhost:${port}`)
})
