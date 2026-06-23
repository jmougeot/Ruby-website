import puppeteer from 'puppeteer'

const URL = process.argv[2] || 'http://localhost:5173/?debug=lake'
const OUT = process.argv[3] || '/tmp/lake.png'
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
  // attend que la 3D ait rendu ses premières frames si l'API est dispo, sinon settle fixe
  await page
    .waitForFunction('window.__captureAPI && window.__captureAPI.isReady()', { timeout: 60000 })
    .catch(() => console.log('(pas de captureAPI — settle fixe)'))
  await new Promise((r) => setTimeout(r, 6000)) // laisse modèles/eau/ciel se stabiliser
  await page.screenshot({ path: OUT })
  console.log('✅', OUT)
} finally {
  await browser.close()
}
