// ─────────────────────────────────────────────────────────────────────────────
// RÉGLAGES & CONSTANTES DU PARCOURS — fichier PUR (AUCUN import `three`).
//
// C'est ce qui garde three.js HORS du bundle initial : Hero / ScrollThread /
// scrollChoreography (chargés en EAGER) lisent ces valeurs sans tirer ~200 Ko gzip
// de three. Les FONCTIONS géométriques (qui ont besoin de three) vivent dans
// ./caveGeometry, importé uniquement par les fichiers 3D (lazy).
//
// → Pour régler le « feel » du parcours, tout est ICI (constantes + easings).
// ─────────────────────────────────────────────────────────────────────────────

// ── Géométrie / échelle de la grotte ──
export const TUBE_R = 31 // caverne vaste (≈ ×3) — un peu plus grande avant la vidéo
export const WATER_Y = -13 // niveau de l'eau (sous l'axe du tunnel)

// ── Écran démo (16:9) — dimensions partagées par DemoScreen (le maillage) et
//    RubyRig (calcul de la distance caméra qui « contient » la vidéo dans le cadre,
//    cf. Ruby.jsx : plein largeur sur portrait mobile au lieu d'un bandeau rogné).
export const SCREEN_W = 24
export const SCREEN_H = 13.5

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
  breakTau: 0.08, // lissage du BRIS de l'écran : court (colle au scroll) mais absorbe les
  // à-coups des pas de scroll/aimant → l'éclatement des fragments ne saccade plus
  // (avant : réglé en dur = valeur brute → seul élément non lissé, il « beuguait »)
  // rubis ancré DEVANT la caméra
  rubyAhead: 7.5, // distance devant la caméra (le long du regard)
  rubyDrop: 3, // posé plus bas que l'axe du regard
  rubyTau: 0.18, // ressort (petit = vif/réactif → peut « foncer »)
}

// ── Repères le long de la courbe (paramètre u) ──
export const U_START = 0.05 // DÉPART décalé DANS la grotte : Ruby ne part plus de u=0 mais d'ici.
// → l'écran (U_SCREENS) et le 1er arrêt (U_STOP) ne bougent PAS ; seul le trajet AVANT la vidéo
//   raccourcit (U_STOP − U_START au lieu de U_STOP) → le parcours dans la grotte est plus court.
export const U_SCREENS = 0.17 // position de l'écran démo le long de la courbe (INCHANGÉE)
export const U_STOP = U_SCREENS - LEAD // le rubis s'arrête PILE à l'écran (dérive plafonnée)
export const U_END = 0.2475 // bout du tunnel (INCHANGÉ : tout l'après-vidéo reste identique)

// ── Découpage du scroll ──
// Section très haute (Hero h-[1490vh]) : TOUT le parcours de Ruby est lent. La pause
// et le bris (Ruby immobile) gardent ≈ leur longueur d'origine.
// NB : le PREMIER tronçon (départ → vidéo démo) a été RACCOURCI de moitié (≈820vh →
// ≈410vh). Tous les AUTRES tronçons gardent leur longueur de scroll d'origine : les
// seuils ci-dessous ET la hauteur du hero (1900→1490vh) ont été recalés ensemble.
export const U_ARRIVE = 0.275 // fin du trajet : arrivé sur la vidéo (1er tronçon ÷2)
export const U_HOLD = 0.326 // fin de la PAUSE (vidéo plein écran figée) → le bris démarre après
export const U_BREAK = 0.415 // fin du BRIS : Ruby reste bloqué tant que l'écran n'est pas brisé à 100%
export const S_CAVE_END = 0.798 // bout de la grotte : la croisière s'arrête, le 1er
// message ("Ruby finds…") apparaît, caméra FIGÉE au bout de grotte (pose A).
// PAUSE DE LECTURE du 1er message : entre S_CAVE_END et S_MSG_HOLD tout est figé
// (uRef=U_END, exit=0) → on lit le 1er texte. L'aimant de sortie ne s'arme qu'APRÈS
// S_MSG_HOLD (exactement comme la pause vidéo) → on S'ARRÊTE vraiment sur le 1er message.
export const S_MSG_HOLD = 0.849 // fin de la pause de lecture du 1er message
// SLIDE 3 : on remonte dans le puits et on se BLOQUE devant le 2e message (pose B).
// SLIDE 4 : on repart et on émerge sur le lac (pose C).
export const S_EXIT_RISE = 0.887 // fin de la montée → l'aimant BLOQUE ici (devant le 2e message)
export const S_EXIT_HOLD = 0.938 // fin du LARGE palier (zone morte : l'inertie meurt avant
// que l'aimant du lac s'arme → on reste vraiment bloqué devant le message)
export const S_EXIT_END = 0.964 // l'aimant BLOQUE ici (sur le lac) ; au-delà → PAUSE tampon
export const EXIT_HOLD = 0.3 // niveau de remontée (exit) auquel on se bloque pendant le palier
// (plus bas = on s'arrête plus tôt/plus bas dans le puits, devant le message)
// (de S_EXIT_END à 1 : Ruby figé sur le lac → un scroll ne saute pas direct aux sections suivantes)

// ── Sortie par le haut (lac) ──
export const LAKE_Y = 72 // niveau du lac, bien au-dessus du plafond → on sort par le haut
// (plus de trou de plafond / cheminée séparée : le tunnel est UNE seule courbe qui se
//  relève jusqu'au lac — cf. exitPath dans caveGeometry.js et TunnelWalls.)

// ── Easings PURS ──────────────────────────────────────────────────────────────
// clamp [0,1] en Math natif (= THREE.MathUtils.clamp(x, 0, 1), strictement identique
// mais sans tirer three → ces easings restent utilisables par le code eager).
const clamp01 = (x) => Math.min(1, Math.max(0, x))

export const smooth01 = (x) => {
  x = clamp01(x)
  return x * x * (3 - 2 * x)
}

/** Profil « trapèze » (en position) : vitesse CONSTANTE au milieu, rampes aux bouts.
 *  `kIn` = rampe d'ACCÉLÉRATION au départ, `kOut` = rampe de DÉCÉLÉRATION à l'arrêt
 *  (portions de 0 à 0.5 ; par défaut kOut = kIn → symétrique, ancien comportement).
 *  Asymétrique (kIn petit, kOut plus grand) → démarrage VIF, arrêt doux. Continu en
 *  position ET en vitesse. */
export const trapezoidEase = (s, kIn = 0.18, kOut = kIn) => {
  s = clamp01(s)
  const norm = 1 - kIn / 2 - kOut / 2
  if (s < kIn) return (s * s) / (2 * kIn) / norm
  if (s > 1 - kOut) {
    const d = 1 - s
    return (norm - (d * d) / (2 * kOut)) / norm
  }
  return (s - kIn / 2) / norm
}
