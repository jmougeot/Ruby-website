// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION DE LA CARTE SOCIALE (Open Graph / Twitter) — 1200×630.
//
// Rend une carte HTML brandée via Puppeteer et l'exporte en JPEG dans
// public/og-card.jpg. À relancer manuellement quand la marque/tagline change :
//   node scripts/build-og.mjs
// (volontairement HORS du build CI : l'asset est statique et commité.)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const markB64 = readFileSync(join(ROOT, 'public/logo-mark.png')).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    display: flex; flex-direction: column; justify-content: center;
    padding: 90px;
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    background:
      radial-gradient(900px 500px at 88% 12%, rgba(255,77,90,0.22), transparent 60%),
      #0b0b0d;
    color: #fafaf7;
  }
  .brand { display: flex; align-items: center; gap: 22px; margin-bottom: 56px; }
  .brand img { width: 76px; height: 76px; }
  .brand span { font-size: 46px; font-weight: 700; letter-spacing: -0.02em; }
  h1 {
    font-size: 78px; line-height: 1.04; font-weight: 700;
    letter-spacing: -0.03em; max-width: 940px;
  }
  h1 b { color: #ff4d5a; font-weight: 700; }
  p { margin-top: 36px; font-size: 30px; color: #8a8a92; max-width: 880px; line-height: 1.4; }
  .url { margin-top: auto; font-size: 26px; color: #8a8a92; letter-spacing: 0.02em; }
</style></head><body>
  <div class="brand"><img src="data:image/png;base64,${markB64}"><span>Ruby</span></div>
  <h1>Become the sales rep<br>you know you <b>can be</b>.</h1>
  <p>Ruby analyzes your calls, finds what's holding you back, and helps you improve one habit at a time.</p>
  <div class="url">rubysignal.com</div>
</body></html>`

const browser = await puppeteer.launch({ headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle0' })
const buf = await page.screenshot({ type: 'jpeg', quality: 88 })
await browser.close()

writeFileSync(join(ROOT, 'public/og-card.jpg'), buf)
console.log(`✓ carte OG générée : public/og-card.jpg (${buf.length} o)`)
