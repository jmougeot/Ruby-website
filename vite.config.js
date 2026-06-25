import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ─────────────────────────────────────────────────────────────────────────────
// blogDev — sert le journal (/blog/…, /feed.xml, /sitemap.xml) en `vite dev`.
//
// Le blog est généré dans dist/ au BUILD (scripts/build-blog.mjs) ; en dev, ces
// pages n'existaient pas → cliquer « Blog » retombait sur la SPA (la home). Ici on
// rend le même HTML EN MÉMOIRE via scripts/blog-render.mjs, chargé par
// server.ssrLoadModule (qui transpile le JSX des templates + relit les .md à chaque
// requête → édition d'un article visible au rechargement). Les CSS/JS/images du
// blog (/css, /js, /assets) sont déjà servis par vite depuis public/.
// ─────────────────────────────────────────────────────────────────────────────
function blogDev() {
  return {
    name: 'blog-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        let key = decodeURIComponent(url).replace(/^\/+/, '')
        // On ne gère QUE le journal et ses deux flux ; le reste → SPA / vite.
        if (key !== 'feed.xml' && key !== 'sitemap.xml' && !key.startsWith('blog')) {
          return next()
        }
        // Normalise vers une clé d'entrée : /blog/ → blog/index.html, /blog/x → x/index.html.
        if (key === '' || key.endsWith('/')) key += 'index.html'
        else if (!key.split('/').pop().includes('.')) key += '/index.html'

        try {
          const { renderBlog } = await server.ssrLoadModule('/scripts/blog-render.mjs')
          const entry = renderBlog().entries.find((e) => e.path === key)
          if (!entry) return next() // article inconnu → 404 SPA habituelle
          res.statusCode = 200
          res.setHeader(
            'Content-Type',
            entry.type === 'xml' ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8',
          )
          res.end(entry.content)
        } catch (err) {
          server.ssrFixStacktrace(err)
          next(err)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), blogDev()],
})
