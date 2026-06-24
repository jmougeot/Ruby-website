// ─────────────────────────────────────────────────────────────────────────────
// CARTES SOCIALES PAR ARTICLE (Open Graph) — 1200×630, une par post.
//
// Les illustrations d'article sont en .svg → NON rendues en aperçu par
// LinkedIn / X / Slack. On génère donc une carte raster brandée par article
// (titre + rubrique), exportée dans public/assets/og/<slug>.jpg.
// À relancer quand un titre/article change :  node scripts/build-og-articles.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import puppeteer from 'puppeteer'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const POSTS_DIR = join(ROOT, 'blog/posts')
const OUT_DIR = join(ROOT, 'public/assets/og')
mkdirSync(OUT_DIR, { recursive: true })

const markB64 = readFileSync(join(ROOT, 'public/logo-mark.png')).toString('base64')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const card = ({ title, category }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    display: flex; flex-direction: column;
    padding: 84px;
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    background:
      radial-gradient(900px 520px at 90% 8%, rgba(255,77,90,0.20), transparent 60%),
      #0b0b0d;
    color: #fafaf7;
  }
  .brand { display: flex; align-items: center; gap: 18px; }
  .brand img { width: 56px; height: 56px; }
  .brand span { font-size: 30px; font-weight: 600; letter-spacing: -0.01em; }
  .kicker { margin-top: 64px; font-size: 24px; font-weight: 600; letter-spacing: 0.08em;
            text-transform: uppercase; color: #ff4d5a; }
  h1 { margin-top: 22px; font-size: 64px; line-height: 1.08; font-weight: 700;
       letter-spacing: -0.02em; max-width: 1000px;
       display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .url { margin-top: auto; font-size: 24px; color: #8a8a92; letter-spacing: 0.02em; }
</style></head><body>
  <div class="brand"><img src="data:image/png;base64,${markB64}"><span>Le journal de Ruby</span></div>
  ${category ? `<div class="kicker">${esc(category)}</div>` : ''}
  <h1>${esc(title)}</h1>
  <div class="url">rubysignal.com/blog</div>
</body></html>`

const posts = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((file) => {
    const { data } = matter(readFileSync(join(POSTS_DIR, file), 'utf8'))
    const slug = basename(file, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '')
    return { slug, title: data.title, category: data.category }
  })

const browser = await puppeteer.launch({ headless: 'new' })
for (const p of posts) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
  await page.setContent(card(p), { waitUntil: 'load' })
  const buf = await page.screenshot({ type: 'jpeg', quality: 86 })
  writeFileSync(join(OUT_DIR, `${p.slug}.jpg`), buf)
  await page.close()
  console.log(`  ✓ ${p.slug}.jpg (${buf.length} o)`)
}
await browser.close()
console.log(`✓ ${posts.length} cartes OG d'article générées dans public/assets/og/`)
