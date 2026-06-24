// ─────────────────────────────────────────────────────────────────────────────
// PRÉ-RENDU DE LA HOME (SEO) — injecte le contenu statique de <App/> dans #root.
//
// La landing est une SPA React : le HTML livré ne contenait que <div id="root">,
// donc INVISIBLE aux crawlers tant que le JS n'a pas tourné. Ici on rend <App/>
// en HTML statique (renderToStaticMarkup) et on l'injecte dans #root de
// dist/index.html (déjà produit par `vite build`).
//
// PLACEHOLDER, PAS HYDRATATION : au montage, createRoot().render() REMPLACE le
// contenu de #root (cf. src/main.jsx). Donc :
//   - aucun risque de mismatch d'hydratation,
//   - la cinématique 3D / la stabilité de hauteur du hero sont INTACTES
//     (côté serveur use3D=false → on rend le repli image + le titre, pas la 3D),
//   - les crawlers voient enfin H1, copy, narration, intégrations, CTA, footer.
//
// À lancer APRÈS `vite build` (a besoin de dist/index.html avec ses <script> hashés).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import App from '../src/App.jsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX = join(ROOT, 'dist/index.html')

// 1) Rendu statique de l'arbre. Les effets (useEffect) ne s'exécutent pas ici →
//    seul le 1er rendu compte. Hero lit use3D=false (pas de window) → repli image.
let markup = renderToStaticMarkup(createElement(App))

// 2) framer-motion sérialise `initial="hidden"` en style="opacity:0" → le texte
//    serait invisible aux crawlers / sans JS. On neutralise (le fragment est de
//    toute façon remplacé au montage). On ne touche pas aux opacités fractionnaires
//    (opacity:0.5) ni aux transforms (sans effet SEO).
markup = markup.replace(/opacity:0(?![.\d])/g, 'opacity:1')

// 3) Injection dans #root (vide après vite build).
const html = readFileSync(INDEX, 'utf8')
const EMPTY_ROOT = '<div id="root"></div>'
if (!html.includes(EMPTY_ROOT)) {
  throw new Error(`prerender-home: "${EMPTY_ROOT}" introuvable dans dist/index.html`)
}
writeFileSync(INDEX, html.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`))

console.log(`✓ home pré-rendue : ${markup.length} o de HTML statique injectés dans #root`)
