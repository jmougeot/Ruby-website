import { useMemo } from 'react'
import * as THREE from 'three'

// ── Géométrie / échelle de la grotte ──
export const TUBE_R = 31 // caverne vaste (≈ ×3) — un peu plus grande avant la vidéo
export const WATER_Y = -13 // niveau de l'eau (sous l'axe du tunnel)

// ── Pilotage du scroll ──
export const IDLE_SPEED = 0.0022 // dérive avant hyper lente quand on ne scrolle pas
export const LEAD = 0.035 // avance du rubis sur la caméra le long de la courbe

// ── Repères le long de la courbe (paramètre u) ──
export const U_SCREENS = 0.17 // position de l'écran démo (tunnel court → chambre tôt)
export const U_STOP = U_SCREENS - LEAD // le rubis s'arrête PILE à l'écran (dérive plafonnée)
export const U_END = 0.36 // après le bris : on continue dans la grotte jusqu'ici

// ── Découpage du scroll ──
export const U_ARRIVE = 0.45 // fin du trajet : arrivé sur la vidéo (~45% du scroll)
export const U_HOLD = 0.58 // fin de la PAUSE (vidéo plein écran figée) → le bris démarre après
export const S_CAVE_END = 0.8 // bout de la grotte ; au-delà → remontée VERTICALE (sortie)

// ── Sortie par le haut (lac) ──
export const LAKE_Y = 72 // niveau du lac, bien au-dessus du plafond → on sort par le haut
export const HOLE_HALF_U = 0.02 // demi-longueur du trou du plafond (en paramètre u)
export const HOLE_UP = 0.6 // radial.y au-delà duquel une face est "au plafond" → retirée

export const smooth01 = (x) => {
  x = THREE.MathUtils.clamp(x, 0, 1)
  return x * x * (3 - 2 * x)
}

/** Transform de l'écran démo (centre + axes) le long de la courbe. Partagé
 *  entre l'écran lui-même et la caméra (qui plonge dedans au climax). */
export function screenTransform(curve) {
  const center = curve.getPointAt(U_SCREENS).clone()
  center.y = WATER_Y + 8
  const tangent = curve.getTangentAt(U_SCREENS).clone().normalize()
  const normal = tangent.clone().multiplyScalar(-1) // vers la caméra qui approche
  return { center, tangent, normal }
}

/** Courbe fermée, PLANE (y≈0) : une nappe d'eau forme un sol constant. */
export function useTunnelCurve() {
  return useMemo(() => {
    const pts = []
    const N = 14
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const radius = 90 + Math.sin(a * 3) * 24
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)
  }, [])
}

export function frameAt(curve, u) {
  const tangent = curve.getTangentAt(u).normalize()
  const ref = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const normal = new THREE.Vector3().crossVectors(tangent, ref).normalize()
  const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize()
  return { tangent, normal, binormal }
}
