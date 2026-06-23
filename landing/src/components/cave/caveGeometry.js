// ─────────────────────────────────────────────────────────────────────────────
// GÉOMÉTRIE & LISSAGES DÉPENDANTS DE THREE.
//
// Extrait de config.js pour que ce dernier reste PUR (sans `three`) → three.js ne
// rentre PLUS dans le bundle initial. Ce module n'est importé que par les fichiers
// 3D (CaveScene & enfants), eux-mêmes chargés en lazy. Les RÉGLAGES (constantes,
// easings purs) restent dans ./config.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react'
import * as THREE from 'three'
import { U_END, LAKE_Y, EXIT_HOLD, U_SCREENS, WATER_Y, CAM } from './config'

// ── Chorégraphie de SORTIE (entre les 2 messages) ────────────────────────────
// La remontée se joue en 3 POSES explicites, interpolées en 2 segments lissés →
// un seul mouvement continu (plus de lerp flou « 30 % du chemin »), et l'ARRÊT de
// lecture EST exactement la pose B.
//   A = bout de grotte : pose de croisière vivante              (exit = 0)
//   B = LECTURE        : caméra montée dans le puits, arrêtée
//                        FACE au message (= où le scroll s'arrête, exit = EXIT_HOLD)
//   C = lac            : émergé au ras de l'eau, regard horizon (exit = 1)
// Poses repérées par (up = hauteur, fwd = déport le long de l'axe grotte→lac)
// autour du bout de grotte. Tout se règle ici.
// Pose C (émergence sur le LAC) — vista ouverte, indépendante du conduit (au ras de
// l'eau, regard vers les cimes). Inchangée.
const EXIT_C_CAM = { up: LAKE_Y + 3, fwd: -8 }
const EXIT_C_LOOK = { up: LAKE_Y + 170, fwd: 200 }
const EXIT_C_RUBY = { up: LAKE_Y + 6, fwd: 18 }

/** CHEMIN DE SORTIE — centerline (coordonnées MONDE) qui PROLONGE le trajet au bout
 *  de grotte par un coude à GRAND rayon (≥ rayon du tube → aucun pincement) qui se
 *  redresse et monte jusque sous la surface du lac.
 *
 *  C'EST LA CLÉ DU « UN SEUL ÉLÉMENT » : ce même chemin sert à la fois à construire
 *  le MAILLAGE du tunnel (TunnelWalls l'ajoute au bout du trajet → une seule
 *  TubeGeometry continue) ET à placer la CAMÉRA de sortie (poses ci-dessous). La
 *  caméra suit donc l'axe du conduit : elle dérive un peu vers l'avant en montant
 *  (au lieu d'une verticale qui sortirait de la roche) → toujours dans le tube, zéro
 *  raccord visible. Le coude est volontairement ample (faible courbure) pour ne pas
 *  replier le tube sur lui-même. */
export function exitPath(curve) {
  const end = curve.getPointAt(U_END).clone()
  const dir = curve.getTangentAt(U_END).clone()
  dir.y = 0
  dir.normalize()
  const P = (fwd, up) => new THREE.Vector3(end.x + dir.x * fwd, up, end.z + dir.z * fwd)
  // (fwd le long de l'axe grotte→lac, up = hauteur). Le dernier point s'arrête sous
  // la surface (LAKE_Y-6) → rebord caché par le plan d'eau opaque.
  return new THREE.CatmullRomCurve3(
    [P(0, 0), P(14, 8), P(26, 26), P(33, 48), P(35, LAKE_Y - 6)],
    false,
    'catmullrom',
    0.5,
  )
}

/** Poses de la sortie (MONDE). La pose B (lecture) est posée SUR le chemin de sortie
 *  → la caméra lit le 2e message en étant déjà DANS le conduit continu. La pose C est
 *  la vista du lac. Forme de retour inchangée → Ruby/KeynoteCards ne changent pas. */
export function exitChoreography(curve) {
  const path = exitPath(curve)
  const uB = 0.5 // pause de lecture à mi-montée du conduit
  const pB = path.getPointAt(uB)
  const tB = path.getTangentAt(uB).clone().normalize()
  const camB = pB.clone().addScaledVector(tB, -11) // en retrait → le message est droit devant
  const msg = pB.clone().addScaledVector(tB, 9) // 2e message, dans l'axe de montée
  // rubis en tête de la montée, MAIS décalé hors de l'axe caméra→message : sinon il
  // tombe pile devant la carte (entre la caméra et le message) et masque le texte
  // (« en plein dessus »). On le pousse sur le côté + plus bas → il se pose dans le
  // coin bas de la carte sans la couvrir, tout en menant toujours la montée.
  const sideB = new THREE.Vector3().crossVectors(tB, new THREE.Vector3(0, 1, 0)).normalize()
  const rubyB = pB
    .clone()
    .addScaledVector(tB, 2) // en tête, dans l'axe de montée
    .addScaledVector(sideB, 6) // décalé sur le côté → hors du texte
    .addScaledVector(new THREE.Vector3(0, 1, 0), -5) // et plus bas dans le cadre

  const end = curve.getPointAt(U_END).clone()
  const dir = curve.getTangentAt(U_END).clone()
  dir.y = 0
  dir.normalize()
  const P = (up, fwd) => new THREE.Vector3(end.x, up, end.z).addScaledVector(dir, fwd)
  return {
    read: EXIT_HOLD, // valeur d'exit de la pose B (= pause de lecture)
    camB,
    lookB: msg.clone(), // la caméra regarde le message
    rubyB,
    msg, // ancrage MONDE FIXE du message (partagé avec KeynoteCards)
    camC: P(EXIT_C_CAM.up, EXIT_C_CAM.fwd),
    lookC: P(EXIT_C_LOOK.up, EXIT_C_LOOK.fwd),
    rubyC: P(EXIT_C_RUBY.up, EXIT_C_RUBY.fwd),
  }
}

/** Lissage exponentiel stable, indépendant du framerate : rapproche `cur` de
 *  `target` avec une constante de temps `tau` (secondes). Remplace les
 *  `Math.min(1, delta*K)` hétérogènes par un réglage homogène. */
export const dampN = (cur, target, tau, dt) =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-dt / Math.max(1e-5, tau)))

/** Idem pour un Vector3 (mutation en place). */
export const damp3 = (vec, target, tau, dt) =>
  vec.lerp(target, 1 - Math.exp(-dt / Math.max(1e-5, tau)))

/** Transform de l'écran démo (centre + axes) le long de la courbe. Partagé
 *  entre l'écran lui-même et la caméra (qui plonge dedans au climax). */
export function screenTransform(curve) {
  const center = curve.getPointAt(U_SCREENS).clone()
  center.y = WATER_Y + 8
  const tangent = curve.getTangentAt(U_SCREENS).clone().normalize()
  const normal = tangent.clone().multiplyScalar(-1) // vers la caméra qui approche
  return { center, tangent, normal }
}

/** Pose A — bout de grotte, PAUSE de lecture du 1er message : la caméra est FIGÉE
 *  (exit=0, eFocus=0). On reconstruit ICI, avec EXACTEMENT les formules de RubyRig,
 *  sa position et son point visé au repos (parallaxe nulle) → on peut poser la
 *  carte 1 PILE sur l'axe de visée, donc parfaitement centrée à l'écran (et plus
 *  seulement « face caméra » mais décalée par la courbure du tunnel). */
export function caveReadPose(curve) {
  const t = U_END
  const camPos = curve.getPointAt(t).clone()
  const camTangent = curve.getTangentAt(t).clone()
  // wide = 1 à l'arrêt (la salle est ouverte) → recul + hauteur maximum
  const pos = camPos.addScaledVector(camTangent, -(CAM.back + CAM.backWide))
  pos.y = WATER_Y + CAM.height + CAM.heightWide
  const look = curve.getPointAt(THREE.MathUtils.clamp(t + CAM.lookAhead, 0, 1)).clone()
  look.y = WATER_Y + CAM.lookHeight
  const forward = look.clone().sub(pos).normalize()
  return { pos, look, forward }
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
