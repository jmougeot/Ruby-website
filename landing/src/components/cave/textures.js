import { createNoise4D } from 'simplex-noise'
import * as THREE from 'three'

/** Normal map procédurale et tileable (bruit 4D → pas de couture). */
export function makeNormalTex(size, octaves, baseFreq, strength) {
  const noise4 = createNoise4D()
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const w = (y / size) * Math.PI * 2
      let n = 0
      let amp = 1
      let f = baseFreq
      for (let o = 0; o < octaves; o++) {
        n += amp * noise4(Math.cos(u) * f, Math.sin(u) * f, Math.cos(w) * f, Math.sin(w) * f)
        amp *= 0.5
        f *= 2.1
      }
      h[y * size + x] = n
    }
  }
  const data = new Uint8Array(size * size * 4)
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength
      const ny = (at(x, y - 1) - at(x, y + 1)) * strength
      const len = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = ((nx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  // lissage : sinon les DataTexture sont en Nearest → texels visibles (« pixels »)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/** Normal map de ROCHE : bruit "ridged" (crêtes/fissures nettes) + fbm,
 *  plus réaliste qu'un simple bruit lisse. */
export function makeRockNormalTex(size = 768) {
  const n4 = createNoise4D()
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const w = (y / size) * Math.PI * 2
      const sx = Math.cos(u)
      const sy = Math.sin(u)
      const sz = Math.cos(w)
      const sw = Math.sin(w)
      let fbm = 0
      let amp = 1
      let f = 1.1
      for (let o = 0; o < 8; o++) {
        fbm += amp * n4(sx * f, sy * f, sz * f, sw * f)
        amp *= 0.5
        f *= 2.1
      }
      // composante ridged : sommets aigus → fissures/strates fines
      let ridge = 0
      let amp2 = 0.8
      let f2 = 2.0
      for (let o = 0; o < 6; o++) {
        const r = 1 - Math.abs(n4(sx * f2, sy * f2, sz * f2, sw * f2))
        ridge += amp2 * r * r
        amp2 *= 0.5
        f2 *= 2.2
      }
      h[y * size + x] = fbm * 0.65 + ridge * 1.0
    }
  }
  const data = new Uint8Array(size * size * 4)
  const S = 3.8
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * S
      const ny = (at(x, y - 1) - at(x, y + 1)) * S
      const len = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = ((nx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/** Map de rugosité : variation de brillance (zones humides/minérales vs mates). */
export function makeRoughnessTex(size = 512) {
  const n4 = createNoise4D()
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const w = (y / size) * Math.PI * 2
      let n = 0
      let amp = 1
      let f = 1.5
      for (let o = 0; o < 4; o++) {
        n += amp * n4(Math.cos(u) * f, Math.sin(u) * f, Math.cos(w) * f, Math.sin(w) * f)
        amp *= 0.5
        f *= 2.2
      }
      const g = THREE.MathUtils.clamp(0.78 + n * 0.22, 0.5, 0.98) * 255
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = g
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/** Halo radial doux (cœur de lumière) : blanc-chaud au centre → rose → transparent. */
export function makeGlowTex() {
  const sz = 256
  const c = document.createElement('canvas')
  c.width = c.height = sz
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2)
  g.addColorStop(0, 'rgba(255,248,240,1)')
  g.addColorStop(0.1, 'rgba(255,214,176,0.95)')
  g.addColorStop(0.32, 'rgba(255,96,120,0.4)')
  g.addColorStop(0.65, 'rgba(214,28,72,0.09)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, sz, sz)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

/** Stries d'ÉCUME verticales (alpha blanc) pour une cascade : filets clairs par
 *  colonne, hachés en pointillés. Modulation verticale PÉRIODIQUE (somme de sinus)
 *  → tileable en Y, donc on peut faire défiler la texture sans couture. */
export function makeStreakTex(size = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const d = img.data
  // par colonne : intensité du filet + phase + fréquence (entière → période exacte)
  const col = new Float32Array(size)
  const ph = new Float32Array(size)
  const kf = new Float32Array(size)
  for (let x = 0; x < size; x++) {
    col[x] = Math.pow(Math.random(), 2.4) // peu de colonnes fortes → filets espacés
    ph[x] = Math.random() * Math.PI * 2
    kf[x] = 2 + Math.floor(Math.random() * 4) // 2..5 ondes sur la hauteur (tileable)
  }
  for (let y = 0; y < size; y++) {
    const yy = (y / size) * Math.PI * 2
    for (let x = 0; x < size; x++) {
      const m = 0.5 + 0.5 * Math.sin(yy * kf[x] + ph[x]) // pointillés périodiques
      let a = col[x] * m
      a = Math.max(0, a * 1.15 - 0.14) // seuil → vrais filets séparés
      const i = (y * size + x) * 4
      d[i] = d[i + 1] = d[i + 2] = 255
      d[i + 3] = Math.min(255, a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}

/** Anneau concentrique lumineux autour du noyau (look « iris » de l'image). */
export function makeRingTex() {
  const sz = 256
  const c = document.createElement('canvas')
  c.width = c.height = sz
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(sz / 2, sz / 2, sz * 0.27, sz / 2, sz / 2, sz * 0.47)
  g.addColorStop(0, 'rgba(255,190,170,0)')
  g.addColorStop(0.5, 'rgba(255,216,188,0.72)')
  g.addColorStop(1, 'rgba(255,120,124,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, sz, sz)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}
