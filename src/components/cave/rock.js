import * as THREE from 'three'

const ROCK = new THREE.Color('#1c1822')
const WARM = new THREE.Color('#322733')
const MINERAL = new THREE.Color('#24303a') // veines minérales froides

/** Relief rocheux partagé (fbm 7 octaves) → même grain pour le tunnel ET la
 *  cheminée. `offset` décale le motif pour éviter une roche identique. */
export function rockFbm(noise, x, y, z, offset = 0) {
  let d = 0
  let amp = 1
  let f = 0.022
  for (let o = 0; o < 7; o++) {
    d += amp * noise(x * f + offset, y * f, z * f + offset)
    amp *= 0.5
    f *= 2.15
  }
  return d
}

/** Teinte rocheuse partagée : roche→chaud (selon le relief) + veines minérales
 *  + occlusion ambiante dans les creux. */
export function rockColor(noise, d, x, y, z) {
  const c = ROCK.clone().lerp(WARM, THREE.MathUtils.clamp(d * 0.5 + 0.5, 0, 1))
  const mv = noise(x * 0.012, y * 0.012, z * 0.012)
  c.lerp(MINERAL, THREE.MathUtils.clamp(mv * 0.5 + 0.5, 0, 1) * 0.28)
  const ao = THREE.MathUtils.clamp(0.72 + d * 0.5, 0.4, 1)
  c.multiplyScalar(ao)
  return c
}
