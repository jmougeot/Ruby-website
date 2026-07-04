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

// ─────────────────────────────────────────────────────────────────────────────
// preloadCave — aplatit la chaîne critique de la 3D au chargement.
//
// Les chunks lazy se découvrent en cascade : index.js → react-three-fiber →
// CaveScene → CavePost (+ PineTree.glb), chaque niveau n'étant demandé qu'après
// l'exécution du précédent → le dernier ne partait qu'à ~1,7 s (audit Lighthouse).
// On injecte au build un script inline dans <head> qui les modulepreload dès le
// HTML : tout se télécharge en parallèle SANS être exécuté — le bundle initial
// reste donc sans three (invariant perf de la landing).
//
// Script inline plutôt que des <link> statiques pour UNE raison : en
// reduced-motion la 3D ne monte jamais (cf. Hero.jsx), on s'épargne ~330 Ko.
// ─────────────────────────────────────────────────────────────────────────────
function preloadCave() {
  return {
    name: 'preload-cave',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return
        const chunks = Object.values(ctx.bundle)
          .filter((c) => c.type === 'chunk' && /react-three-fiber|CaveScene|CavePost/.test(c.fileName))
          .map((c) => ['/' + c.fileName, 'modulepreload'])
        if (!chunks.length) return
        // as="fetch" + crossorigin : doit matcher le fetch de GLTFLoader (mode cors,
        // credentials same-origin), sinon le preload est ignoré et re-téléchargé.
        const entries = [...chunks, ['/models/PineTree.glb', 'preload', 'fetch']]
        const js =
          "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)" +
          `for(const[href,rel,as]of ${JSON.stringify(entries)}){` +
          "const l=document.createElement('link');l.rel=rel;l.href=href;l.crossOrigin='';" +
          "if(as){l.setAttribute('as',as);l.fetchPriority='low'}" +
          'document.head.appendChild(l)}'
        return [{ tag: 'script', children: js, injectTo: 'head' }]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), blogDev(), preloadCave()],
})
