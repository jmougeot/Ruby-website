// ─────────────────────────────────────────────────────────────────────────────
// MODE CAPTURE — rendu DÉTERMINISTE de la grotte pour les captures d'écran.
//
// Quand la page est ouverte avec ?capture, on n'utilise plus le scroll : un script
// Puppeteer (scripts/shot-at.mjs) pilote la progression de l'extérieur via
// window.__captureAPI puis prend une image. ScrollDriver lit getCaptureProgress()
// chaque frame et applique la timeline SANS lissage → même p ⇒ même image (capture
// reproductible à une étape précise du voyage, pour régler le décor).
// ─────────────────────────────────────────────────────────────────────────────
export const CAPTURE =
  typeof window !== 'undefined' && window.location.search.includes('capture')

let _p = 0 // progression courante 0→1, fixée par le script
let _ready = false // scène chargée + premières frames dessinées

/** Lu par ScrollDriver (CaveScene) à chaque frame en mode capture. */
export const getCaptureProgress = () => _p

/** Appelé une fois la scène prête (cf. FirstFrame) → débloque le script. */
export const setCaptureReady = () => {
  _ready = true
}

if (CAPTURE && typeof window !== 'undefined') {
  window.__captureAPI = {
    setProgress(p) {
      _p = Math.min(1, Math.max(0, p))
    },
    getProgress: () => _p,
    isReady: () => _ready,
  }
}
