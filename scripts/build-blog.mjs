// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION STATIQUE DU BLOG (remplace Eleventy).
//
// Écrit dans dist/ les pages du journal rendues par scripts/blog-render.mjs :
//   /blog/index.html                      (la une + liste)
//   /blog/<slug>/index.html               (article ; slug = nom de fichier sans la date)
//   /blog/rubrique/<cat>/index.html       (page de catégorie)
//   /feed.xml  /sitemap.xml
//
// La LOGIQUE de rendu vit dans blog-render.mjs (partagée avec le serveur de dev de
// vite.config.js, qui sert le même HTML en mémoire). Ici on ne fait QU'écrire.
//
// À lancer APRÈS `vite build` (qui crée dist/). Cf. package.json → "build".
// URLs, RSS et sitemap reproduisent À L'IDENTIQUE la sortie Eleventy précédente.
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderBlog } from './blog-render.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') // landing/
const DIST = join(ROOT, 'dist')

const { entries, posts, categories } = renderBlog()

for (const { path, content } of entries) {
  const full = join(DIST, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

console.log(`✓ blog généré : ${posts.length} articles, ${categories.length} rubriques, feed + sitemap`)
