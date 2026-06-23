import puppeteer from 'puppeteer'

// usage: node scripts/shot-at.mjs <progress 0..1> <out.png>
const P = parseFloat(process.argv[2] ?? '0.45')
const OUT = process.argv[3] || '/tmp/shot.png'
const URL = 'http://localhost:5173/?capture'
const W = 1600
const H = 900

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--no-sandbox',
    `--window-size=${W},${H}`,
  ],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.error('[page error]', e.message))
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction('window.__captureAPI && window.__captureAPI.isReady()', { timeout: 90000 })
  await page.evaluate((v) => window.__captureAPI.setProgress(v), P)
  // laisse plusieurs rAF + la vidéo se peindre
  await new Promise((r) => setTimeout(r, 4000))
  await page.evaluate((v) => window.__captureAPI.setProgress(v), P)
  await new Promise((r) => setTimeout(r, 2000))
  await page.screenshot({ path: OUT })
  console.log('✅', OUT, 'at p=', P)
} finally {
  await browser.close()
}
