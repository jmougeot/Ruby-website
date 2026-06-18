import { useMemo } from 'react'
import * as THREE from 'three'

// ── Géométrie / échelle de la grotte ──
export const TUBE_R = 31 // caverne vaste (≈ ×3) — un peu plus grande avant la vidéo
export const WATER_Y = -13 // niveau de l'eau (sous l'axe du tunnel)

// ── Pilotage du scroll ──
export const LEAD = 0.035 // avance du rubis sur la caméra le long de la courbe

// ── Réglages CAMÉRA (tous les curseurs du « feel » au même endroit) ──
// Les constantes de temps (`tau`) sont en SECONDES : plus grand = plus mou/calme.
export const CAM = {
  // suivi : position caméra relative au point courant sur la courbe
  back: 4.2, // recul derrière le point courant (le long de la tangente)
  backWide: 5, // recul EN PLUS quand la salle s'ouvre (approche écran)
  height: 9, // hauteur caméra au-dessus de l'eau (WATER_Y + height)
  heightWide: 4, // hauteur en plus à l'ouverture
  // regard : un point DEVANT, le long du tunnel (on ne vise plus le rubis)
  lookAhead: 0.045, // distance (en u) du point visé devant la caméra
  lookHeight: 9, // hauteur du point visé (= height → regard ~horizontal)
  // lissage caméra
  posTau: 0.45, // lissage POSITION en croisière (filtre l'ondulation des virages)
  posLockTau: 0.12, // lissage POSITION net au climax écran / à la sortie
  lookTau: 0.5, // lissage REGARD (yaw doux)
  lookLockTau: 0.15, // lissage REGARD resserré au climax écran → cale net, sans saut
  // « légère vie » : parallaxe souris (gardée discrète)
  parallax: 0.45, // amplitude X (était 1.0)
  parallaxY: 0.28, // amplitude Y (était 0.6)
  parallaxTau: 0.5, // lissage parallaxe
  // pilotage du scroll
  uTau: 0.14, // lissage de l'avancée (était ~0.31 → plus court = colle au scroll)
  exitTau: 0.2, // lissage de la remontée (sortie)
  // rubis ancré DEVANT la caméra
  rubyAhead: 7.5, // distance devant la caméra (le long du regard)
  rubyDrop: 3, // posé plus bas que l'axe du regard
  rubyTau: 0.18, // ressort (petit = vif/réactif → peut « foncer »)
}

// ── Repères le long de la courbe (paramètre u) ──
export const U_SCREENS = 0.17 // position de l'écran démo (tunnel court → chambre tôt)
export const U_STOP = U_SCREENS - LEAD // le rubis s'arrête PILE à l'écran (dérive plafonnée)
export const U_END = 0.2475 // après le bris : distance d'avancée DIVISÉE PAR 2 (était 0.36)
// → Ruby avance 2× moins vite sur le même budget de scroll (trou/exit/lac suivent U_END)

// ── Découpage du scroll ──
// Section très haute (Hero h-[1620vh]) : TOUT le parcours de Ruby est lent. L'arrivée
// et la sortie ont chacune ~3× plus de course de scroll qu'avant (comme l'avancée),
// donc Ruby garde une vitesse douce et constante du début à la fin. La pause et le
// bris (Ruby immobile) gardent ≈ leur longueur d'origine.
export const U_ARRIVE = 0.43 // fin du trajet : arrivé sur la vidéo
export const U_HOLD = 0.47 // fin de la PAUSE (vidéo plein écran figée) → le bris démarre après
export const U_BREAK = 0.54 // fin du BRIS : Ruby reste bloqué tant que l'écran n'est pas brisé à 100%
export const S_CAVE_END = 0.85 // bout de la grotte ; au-delà → remontée VERTICALE (sortie)
// SLIDE 3 : on remonte un peu dans le puits puis on se BLOQUE devant le message
// (la caméra a déjà le bon angle vers le haut). SLIDE 4 : on repart et on sort
// finalement sur le lac.
export const S_EXIT_RISE = 0.88 // fin de la montée → l'aimant BLOQUE ici (devant le message)
export const S_EXIT_HOLD = 0.93 // fin du LARGE palier (zone morte : l'inertie meurt avant
// que l'aimant du lac s'arme → on reste vraiment bloqué devant le message)
export const S_EXIT_END = 0.95 // l'aimant BLOQUE ici (sur le lac) ; au-delà → PAUSE tampon
export const EXIT_HOLD = 0.3 // niveau de remontée (exit) auquel on se bloque pendant le palier
// (plus bas = on s'arrête plus tôt/plus bas dans le puits, devant le message)
// (de S_EXIT_END à 1 : Ruby figé sur le lac → un scroll ne saute pas direct aux sections suivantes)

// ── Sortie par le haut (lac) ──
export const LAKE_Y = 72 // niveau du lac, bien au-dessus du plafond → on sort par le haut
export const HOLE_HALF_U = 0.02 // demi-longueur du trou du plafond (en paramètre u)
export const HOLE_UP = 0.6 // radial.y au-delà duquel une face est "au plafond" → retirée

export const smooth01 = (x) => {
  x = THREE.MathUtils.clamp(x, 0, 1)
  return x * x * (3 - 2 * x)
}

/** Lissage exponentiel stable, indépendant du framerate : rapproche `cur` de
 *  `target` avec une constante de temps `tau` (secondes). Remplace les
 *  `Math.min(1, delta*K)` hétérogènes par un réglage homogène. */
export const dampN = (cur, target, tau, dt) =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-dt / Math.max(1e-5, tau)))

/** Idem pour un Vector3 (mutation en place). */
export const damp3 = (vec, target, tau, dt) =>
  vec.lerp(target, 1 - Math.exp(-dt / Math.max(1e-5, tau)))

/** Profil « trapèze » (en position) : vitesse 0 aux deux bouts, CONSTANTE au
 *  milieu. `k` = portion de rampe à chaque extrémité (0<k≤0.5). Donne une
 *  croisière régulière avec démarrage/arrêt doux (pas d'à-coup aux pauses).
 *  Continu en position ET en vitesse. */
export const trapezoidEase = (s, k = 0.18) => {
  s = THREE.MathUtils.clamp(s, 0, 1)
  const norm = 1 - k
  if (s < k) return (s * s) / (2 * k) / norm
  if (s > 1 - k) {
    const d = 1 - s
    return (norm - (d * d) / (2 * k)) / norm
  }
  return (s - k / 2) / norm
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

// position du message de fin de grotte (un peu plus loin que l'arrêt caméra,
// donc en profondeur dans le tunnel, juste avant la remontée verticale)
export const U_MESSAGE = U_END + 0.012

/** Transform du message de fin (centre + axes) au bout de la grotte, juste avant
 *  la sortie. Même logique que l'écran démo : posé sur la courbe, face caméra. */
export function messageTransform(curve) {
  const center = curve.getPointAt(U_MESSAGE).clone()
  center.y = WATER_Y + 9
  const tangent = curve.getTangentAt(U_MESSAGE).clone().normalize()
  return { center, tangent }
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
