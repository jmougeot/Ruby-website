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
export const S_CAVE_END = 0.84 // bout de la grotte : la croisière s'arrête, le 1er
// message ("Ruby finds…") apparaît, caméra FIGÉE au bout de grotte (pose A).
// PAUSE DE LECTURE du 1er message : entre S_CAVE_END et S_MSG_HOLD tout est figé
// (uRef=U_END, exit=0) → on lit le 1er texte. L'aimant de sortie ne s'arme qu'APRÈS
// S_MSG_HOLD (exactement comme la pause vidéo) → on S'ARRÊTE vraiment sur le 1er message.
export const S_MSG_HOLD = 0.88 // fin de la pause de lecture du 1er message
// SLIDE 3 : on remonte dans le puits et on se BLOQUE devant le 2e message (pose B).
// SLIDE 4 : on repart et on émerge sur le lac (pose C).
export const S_EXIT_RISE = 0.91 // fin de la montée → l'aimant BLOQUE ici (devant le 2e message)
export const S_EXIT_HOLD = 0.95 // fin du LARGE palier (zone morte : l'inertie meurt avant
// que l'aimant du lac s'arme → on reste vraiment bloqué devant le message)
export const S_EXIT_END = 0.97 // l'aimant BLOQUE ici (sur le lac) ; au-delà → PAUSE tampon
export const EXIT_HOLD = 0.3 // niveau de remontée (exit) auquel on se bloque pendant le palier
// (plus bas = on s'arrête plus tôt/plus bas dans le puits, devant le message)
// (de S_EXIT_END à 1 : Ruby figé sur le lac → un scroll ne saute pas direct aux sections suivantes)

// ── Sortie par le haut (lac) ──
export const LAKE_Y = 72 // niveau du lac, bien au-dessus du plafond → on sort par le haut
// (plus de trou de plafond / cheminée séparée : le tunnel est UNE seule courbe qui se
//  relève jusqu'au lac — cf. exitPath ci-dessous et TunnelWalls.)

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
const EXIT_C_RUBY = { up: LAKE_Y + 1.3, fwd: 18 }

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
  const rubyB = pB.clone().addScaledVector(tB, 2) // rubis en tête

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
