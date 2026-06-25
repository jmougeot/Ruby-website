// ─────────────────────────────────────────────────────────────────────────────
// RENDU DU BLOG (logique partagée) — produit toutes les pages du journal EN MÉMOIRE.
//
// Lit les articles Markdown (blog/posts/*.md), les rend via les composants React
// (blog/templates/*) et renvoie un tableau d'entrées { path, content, type } :
//   blog/index.html                      (la une + liste)
//   blog/<slug>/index.html               (article ; slug = nom de fichier sans la date)
//   blog/rubrique/<cat>/index.html       (page de catégorie)
//   feed.xml  sitemap.xml
//
// DEUX consommateurs partagent ce module → une seule source de vérité :
//   • scripts/build-blog.mjs   → écrit les entrées sur le disque (dist/) au build.
//   • vite.config.js (dev)     → sert les entrées en mémoire (sinon /blog n'existe
//                                 pas tant qu'on n'a pas buildé → « le blog marche pas »).
// ─────────────────────────────────────────────────────────────────────────────
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import { site, dateIso, slugify, absoluteUrl, readingTime, xmlEscape } from '../blog/site.js'
import Layout from '../blog/templates/Layout.jsx'
import BlogIndex from '../blog/templates/BlogIndex.jsx'
import Article from '../blog/templates/Article.jsx'
import Rubrique from '../blog/templates/Rubrique.jsx'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..') // landing/
const POSTS_DIR = join(ROOT, 'blog/posts')

// markdown-it avec html:true → même réglage que le markdown par défaut d'Eleventy.
const md = new MarkdownIt({ html: true })

const renderPage = (props, child) =>
  '<!DOCTYPE html>\n' + renderToStaticMarkup(h(Layout, props, child))

/**
 * Rend tout le journal et renvoie les entrées à servir/écrire.
 * Relit les fichiers à CHAQUE appel → en dev, éditer un .md se voit au rechargement.
 * @returns {{ path: string, content: string, type: 'html'|'xml' }[]}
 */
export function renderBlog() {
  // 1) Charger les articles. slug = nom de fichier SANS le préfixe date (comme le
  //    fileSlug d'Eleventy : 2026-05-09-discovery-call-framework → discovery-call-framework).
  const posts = readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data, content } = matter(readFileSync(join(POSTS_DIR, file), 'utf8'))
      const fileSlug = basename(file, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '')
      return { file, fileSlug, url: `/blog/${fileSlug}/`, data, contentHtml: md.render(content) }
    })

  // 2) Ordre de la collection « posts » d'Eleventy : tri ASC (date, puis nom de fichier)
  //    puis .reverse() → le plus récent en premier (départage des dates égales identique).
  posts.sort((a, b) => {
    const d = +new Date(a.data.date) - +new Date(b.data.date)
    return d !== 0 ? d : a.file < b.file ? -1 : a.file > b.file ? 1 : 0
  })
  posts.reverse()

  // 3) Catégories uniques dans l'ordre d'apparition ASC (comme la collection postCategories).
  const categories = []
  for (const p of [...posts].reverse()) {
    if (p.data.category && !categories.includes(p.data.category)) categories.push(p.data.category)
  }

  const entries = []
  const add = (path, content, type = 'html') => entries.push({ path, content, type })

  // 4) Index /blog/
  add(
    'blog/index.html',
    renderPage(
      {
        title: 'Le journal de Ruby — Analyses sur la vente',
        metaTitle: 'Le journal de Ruby — Analyses sur la vente',
        description:
          "Méthodes, analyses terrain et retours d'expérience pour les équipes commerciales. Le journal de Ruby.",
        ogUrl: '/blog/',
        activeUrl: '/blog/',
        categories,
      },
      h(BlogIndex, { posts }),
    ),
  )

  // 5) Articles /blog/<slug>/
  for (const post of posts) {
    const related = posts.filter((p) => p.url !== post.url).slice(0, 3)
    // Carte sociale raster dédiée (cf. scripts/build-og-articles.mjs) : l'illustration
    // d'article est en .svg, non rendue en aperçu par LinkedIn/X/Slack → on sert la carte.
    const ogImage = `/assets/og/${post.fileSlug}.jpg`
    add(
      `blog/${post.fileSlug}/index.html`,
      renderPage(
        {
          title: post.data.title,
          description: post.data.excerpt,
          ogType: 'article',
          ogUrl: post.url,
          image: ogImage,
          date: post.data.date,
          categories,
          activeUrl: post.url,
        },
        h(Article, { post, contentHtml: post.contentHtml, minutes: readingTime(post.contentHtml), related, ogImage }),
      ),
    )
  }

  // 6) Rubriques /blog/rubrique/<cat>/
  for (const cat of categories) {
    const url = `/blog/rubrique/${slugify(cat)}/`
    add(
      `blog/rubrique/${slugify(cat)}/index.html`,
      renderPage(
        {
          metaTitle: `${cat} — Le journal de Ruby`,
          description: `Tous nos articles de la rubrique ${cat} : analyses et méthodes de vente.`,
          ogUrl: url,
          activeUrl: url,
          categories,
        },
        h(Rubrique, { category: cat, posts: posts.filter((p) => p.data.category === cat) }),
      ),
    )
  }

  // 7) feed.xml (Atom) — ordre = collection (récent d'abord)
  add(
    'feed.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
    <title>${xmlEscape(site.journalName)}</title>
    <subtitle>${xmlEscape(site.tagline)}</subtitle>
    <link href="${absoluteUrl('/feed.xml')}" rel="self"/>
    <link href="${absoluteUrl('/blog/')}"/>
    <id>${absoluteUrl('/blog/')}</id>
    ${posts.length ? `<updated>${dateIso(posts[0].data.date)}</updated>` : ''}
    <author><name>${xmlEscape(site.author)}</name></author>
${posts
  .map(
    (p) => `    <entry>
        <title>${xmlEscape(p.data.title)}</title>
        <link href="${absoluteUrl(p.url)}"/>
        <id>${absoluteUrl(p.url)}</id>
        <updated>${dateIso(p.data.date)}</updated>
        <summary>${xmlEscape(p.data.excerpt)}</summary>
    </entry>`,
  )
  .join('\n')}
</feed>
`,
    'xml',
  )

  // 8) sitemap.xml (ai.html / demo.html retirés)
  add(
    'sitemap.xml',
    `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/', '/privacy.html', '/terms.html', '/blog/']
  .map((u) => `    <url><loc>${absoluteUrl(u)}</loc></url>`)
  .join('\n')}
${posts
  .map(
    (p) => `    <url>
        <loc>${absoluteUrl(p.url)}</loc>
        <lastmod>${dateIso(p.data.date)}</lastmod>
    </url>`,
  )
  .join('\n')}
${categories
  .map((c) => `    <url><loc>${absoluteUrl(`/blog/rubrique/${slugify(c)}/`)}</loc></url>`)
  .join('\n')}
</urlset>
`,
    'xml',
  )

  return { entries, posts, categories }
}
