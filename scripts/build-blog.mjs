// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION STATIQUE DU BLOG (remplace Eleventy).
//
// Lit les articles Markdown (blog/posts/*.md), les rend via les composants React
// (blog/templates/*) en HTML statique, et écrit dans dist/ :
//   /blog/index.html                      (la une + liste)
//   /blog/<slug>/index.html               (article ; slug = nom de fichier sans la date)
//   /blog/rubrique/<cat>/index.html       (page de catégorie)
//   /feed.xml  /sitemap.xml
//
// À lancer APRÈS `vite build` (qui crée dist/). Cf. package.json → "build".
// URLs, RSS et sitemap reproduisent À L'IDENTIQUE la sortie Eleventy précédente.
// ─────────────────────────────────────────────────────────────────────────────
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
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
const DIST = join(ROOT, 'dist')

// markdown-it avec html:true → même réglage que le markdown par défaut d'Eleventy.
const md = new MarkdownIt({ html: true })

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

const write = (relPath, content) => {
  const full = join(DIST, relPath)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}
const renderPage = (props, child) =>
  '<!DOCTYPE html>\n' + renderToStaticMarkup(h(Layout, props, child))

// 4) Index /blog/
write(
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
  write(
    `blog/${post.fileSlug}/index.html`,
    renderPage(
      {
        title: post.data.title,
        description: post.data.excerpt,
        ogType: 'article',
        ogUrl: post.url,
        image: post.data.image,
        date: post.data.date,
        categories,
        activeUrl: post.url,
      },
      h(Article, { post, contentHtml: post.contentHtml, minutes: readingTime(post.contentHtml), related }),
    ),
  )
}

// 6) Rubriques /blog/rubrique/<cat>/
for (const cat of categories) {
  const url = `/blog/rubrique/${slugify(cat)}/`
  write(
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
write(
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
)

// 8) sitemap.xml (ai.html / demo.html retirés)
write(
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
)

console.log(`✓ blog généré : ${posts.length} articles, ${categories.length} rubriques, feed + sitemap`)
