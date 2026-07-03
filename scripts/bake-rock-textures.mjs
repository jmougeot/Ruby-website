// CUISSON des textures de roche procédurales → PNG statiques dans public/.
//
// Pourquoi : makeRockNormalTex(512) + makeRoughnessTex(512) calculaient ~420 ms de
// bruit simplex SUR LE THREAD PRINCIPAL à l'init de la scène (le plus gros poste du
// TBT Lighthouse, caché visuellement par le poster mais compté). Cuites en PNG, le
// décodage se fait hors thread principal et le fichier est mis en cache HTTP.
//
// Usage : dev server lancé (npm run dev), puis  node scripts/bake-rock-textures.mjs
// → régénérer UNIQUEMENT si l'algo de textures.js change (le grain exact est figé,
//   personne ne remarque qu'il ne change plus entre deux visites).
import { writeFileSync } from 'fs'
import puppeteer from 'puppeteer'

const SIZE = 512 // profil desktop ; le mobile (384 avant) reçoit le même fichier —
// +0,6 Mo de VRAM, mais ~300 ms de calcul principal économisés sur téléphone.

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.goto('http://localhost:5173/blog/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // WebP lossy : sur du bruit répété en tuiles minuscules (34×7 / 18×4), les
  // artefacts sont invisibles, et le PNG lossless du même bruit pèse ~4× plus.
  const bake = async (expr, q) =>
    Buffer.from(
      (
        await page.evaluate(
          async (e, quality) => {
            const m = await import('/src/components/cave/textures.js')
            // eslint-disable-next-line no-new-func
            const tex = new Function('m', `return ${e}`)(m)
            const { data, width, height } = tex.image
            const cv = document.createElement('canvas')
            cv.width = width
            cv.height = height
            cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0)
            return cv.toDataURL('image/webp', quality)
          },
          expr,
          q,
        )
      ).split(',')[1],
      'base64',
    )

  writeFileSync('public/rock-normal.webp', await bake(`m.makeRockNormalTex(${SIZE})`, 0.8))
  writeFileSync('public/rock-rough.webp', await bake(`m.makeRoughnessTex(${SIZE})`, 0.85))
  console.log('✅ public/rock-normal.webp + public/rock-rough.webp cuits à', SIZE)
} finally {
  await browser.close()
}
