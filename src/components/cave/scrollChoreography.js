// ─────────────────────────────────────────────────────────────────────────────
// DRAMATURGIE DU SCROLL — source unique de toute la séquence pilotée au scroll.
// Avant, la même chronologie était dupliquée à deux endroits qui devaient rester
// d'accord : le mapping scroll→scène (ScrollDriver, dans CaveScene) ET l'assistance
// de scroll (Hero). Ici tout part des MÊMES seuils (config.js) :
//   1. sampleTimeline(p)   : ce que la SCÈNE doit afficher pour une progression p
//   2. SETTLE_POSES        : les poses de lecture (vidéo, panneaux, lac)
//   3. createScrollAssist  : le contrôleur DOM (glissements guidés + settle)
//
// Toute la séquence, vidéo de départ comprise :
//   trajet → PAUSE vidéo → BRIS de l'écran → croisière → PAUSE msg 1 (bout de
//   grotte) → montée dans le puits → PALIER msg 2 → émergence sur le lac → tampon.
// ─────────────────────────────────────────────────────────────────────────────
import {
  U_START,
  U_STOP,
  U_END,
  U_ARRIVE,
  U_HOLD,
  U_BREAK,
  S_CAVE_END,
  S_MSG_HOLD,
  S_EXIT_RISE,
  S_EXIT_HOLD,
  S_EXIT_END,
  EXIT_HOLD,
  smooth01,
  trapezoidEase,
} from './config'

/** Échantillonne la timeline pour une progression de scroll `p` (0→1).
 *  Renvoie les cibles BRUTES (avant lissage), que ScrollDriver amortit ensuite :
 *   - u    : position le long de la courbe (avancée de Ruby)
 *   - brk  : bris de l'écran vidéo (0→1)
 *   - exit : remontée hors de la grotte vers le lac (0→1) */
export function sampleTimeline(p) {
  // ── avancée le long de la courbe + bris de l'écran vidéo ──
  let u
  let brk = 0
  if (p <= U_ARRIVE) {
    // trajet : profil TRAPÈZE → départ doux, vitesse constante, arrivée sur la
    // vidéo avec vitesse → 0 (raccord net avec la pause, sans à-coup).
    // Départ à U_START (et non 0) → trajet d'approche raccourci, l'arrivée (U_STOP) inchangée.
    u = U_START + (U_STOP - U_START) * trapezoidEase(p / U_ARRIVE)
  } else if (p <= U_HOLD) {
    // PAUSE vidéo : on est sur la vidéo, Ruby figé à l'écran, rien ne casse
    u = U_STOP
  } else if (p <= S_CAVE_END) {
    // BRIS + CROISIÈRE SIMULTANÉS : Ruby CRÈVE l'écran en repartant — les fragments
    // explosent (brk 0→1 sur [U_HOLD, U_BREAK]) pendant que la course reprend, au
    // lieu de « l'écran se casse tout seul, PUIS Ruby repart » (deux temps figés).
    // Garantie géométrique : le bris atteint 100 % (U_BREAK) AVANT que la caméra
    // n'atteigne le plan de l'écran (~31 % de la croisière) → on ne traverse jamais
    // un écran encore visible ; le rubis, LUI, passe au milieu des éclats en vol.
    // Profil TRAPÈZE kIn = 0 → pleine vitesse dès U_HOLD (dampN absorbe le à-coup),
    // kOut = 0.18 → arrêt doux au bout de grotte (la fin que tu aimes).
    brk = smooth01((p - U_HOLD) / (U_BREAK - U_HOLD))
    u = U_STOP + trapezoidEase((p - U_HOLD) / (S_CAVE_END - U_HOLD), 0, 0.18) * (U_END - U_STOP)
  } else {
    // bout de grotte atteint : figé sur la courbe, la suite est VERTICALE (sortie)
    brk = 1
    u = U_END
  }

  // ── remontée hors de la grotte (sortie vers le lac) ──
  let exit
  if (p <= S_MSG_HOLD) {
    // PAUSE DE LECTURE du 1er message : caméra figée au bout de grotte (pose A)
    exit = 0
  } else if (p <= S_EXIT_RISE) {
    // montée dans le puits jusqu'au 2e message (pose B)
    exit = EXIT_HOLD * smooth01((p - S_MSG_HOLD) / (S_EXIT_RISE - S_MSG_HOLD))
  } else if (p <= S_EXIT_HOLD) {
    // PALIER : bloqué dans le puits, face au 2e message
    exit = EXIT_HOLD
  } else {
    // émergence sur le lac (pose C), puis tampon (smooth01 clampe à 1 au-delà)
    exit = EXIT_HOLD + (1 - EXIT_HOLD) * smooth01((p - S_EXIT_HOLD) / (S_EXIT_END - S_EXIT_HOLD))
  }

  return { u, brk, exit }
}

// ── ASSISTANCE DE SCROLL ──────────────────────────────────────────────────────
// L'ancien « aimant » confisquait window.scrollY à chaque swipe vers l'avant :
// animation LINÉAIRE (jusqu'à 3,8 s) puis PIN anti-inertie (scrollTo à chaque frame,
// jusqu'à 1,5 s). Sur trackpad, l'inertie continuait d'émettre des évènements pendant
// le pin → la page « se battait » contre le geste = le fameux mouvement imposé.
//
// Remplacé par DEUX comportements qui ne prennent JAMAIS la main pendant un geste :
//   1. snapTo(p)   : glissement PROGRAMMATIQUE (clics « Suis-moi » / « Break
//                    through »), easing doux, borné court, interrompu net par tout
//                    input utilisateur.
//   2. settle      : à l'ARRÊT du scroll (debounce — l'inertie du trackpad émet des
//                    wheel, donc « arrêt » = inertie morte incluse), si on s'est
//                    arrêté juste AVANT une pose, on FINIT le geste en douceur
//                    jusqu'à elle. Modèle CSS scroll-snap « proximity » : assiste le
//                    cadrage, ne confisque rien.
//
// Les poses restent lisibles SANS assistance : chacune est un PLATEAU de la timeline
// (≥ ~1 écran de scroll, cf. config.js) → même en scroll 100 % libre, la caméra
// passe par chaque pose et y stationne. Le settle ne fait que soigner le cadrage.

// poses de lecture = débuts de plateau (vidéo, panneau 1, panneau 2, lac)
const SETTLE_POSES = [U_ARRIVE, S_CAVE_END, S_EXIT_RISE, S_EXIT_END]
const SETTLE_IDLE_MS = 200 // silence d'input requis avant de considérer le geste fini
const SETTLE_RANGE = 0.028 // portée du rattrapage (en p ≈ 0,3 écran) — au-delà : on n'y touche pas
const SETTLE_MS = 600 // durée du recadrage (easeOut court → « ça se pose », pas « ça m'emmène »)

// glissements programmatiques (boutons) : courts et francs — le voyage doit
// RÉPONDRE au clic, pas cinématiser pendant des secondes.
const SNAP_MIN_MS = 200
const SNAP_MAX_MS = 1200

const easeOutCubic = (k) => 1 - (1 - k) ** 3
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

/** Contrôleur DOM de l'assistance. Ne touche QUE window.scrollY, et uniquement
 *  quand l'utilisateur ne scrolle PAS (settle à l'arrêt / clic explicite).
 *
 *  - getTotal()     : course de scroll de la section hero (offsetHeight - innerHeight)
 *  - getOffsetTop() : décalage haut de la section dans la page
 *
 *  À câbler : maybeSettle() à chaque frame d'update du scroll, dispose() au démontage. */
export function createScrollAssist({ getTotal, getOffsetTop }) {
  let gliding = false // glissement (snapTo ou settle) en cours
  let glideRaf = 0
  let settleTimer = 0
  let lastInputT = 0 // horodatage du dernier input UTILISATEUR (wheel/touch)

  // SEUL l'input direct (wheel/touch) date un « geste » ; nos scrollTo n'émettent
  // pas ces évènements → un glissement en cours est interrompu NET dès que
  // l'utilisateur retouche au scroll. On ne lutte jamais contre le geste.
  const onInput = () => {
    lastInputT = performance.now()
  }
  window.addEventListener('wheel', onInput, { passive: true })
  window.addEventListener('touchmove', onInput, { passive: true })

  const stopGlide = () => {
    gliding = false
    if (glideRaf) cancelAnimationFrame(glideRaf)
    glideRaf = 0
  }

  const runGlide = (targetP, durMs, ease) => {
    const total = getTotal()
    if (total <= 0) return
    const targetY = getOffsetTop() + targetP * total
    const startY = window.scrollY
    const dist = targetY - startY
    if (Math.abs(dist) < 1) return
    const t0 = performance.now()
    gliding = true
    const step = () => {
      // l'utilisateur a repris la main → on lâche immédiatement
      if (lastInputT > t0) return stopGlide()
      const k = Math.min(1, (performance.now() - t0) / durMs)
      window.scrollTo(0, startY + dist * ease(k))
      if (k < 1) {
        glideRaf = requestAnimationFrame(step)
        return
      }
      stopGlide()
    }
    step()
  }

  return {
    /** Glissement PROGRAMMATIQUE vers une progression cible (ex. : clic « Suis-moi »
     *  → on glisse jusqu'à la vidéo démo). `speed` en px/ms fixe la durée
     *  (distance / vitesse), bornée par [SNAP_MIN_MS, maxMs]. */
    snapTo(targetP, speed = 0.45, maxMs = SNAP_MAX_MS) {
      if (gliding) return
      const total = getTotal()
      if (total <= 0) return
      const dist = Math.abs(getOffsetTop() + targetP * total - window.scrollY)
      const durMs = Math.min(maxMs, Math.max(SNAP_MIN_MS, dist / Math.max(speed, 0.05)))
      runGlide(targetP, durMs, easeInOutCubic)
    },
    /** À appeler à chaque update de scroll : (ré)arme le settle. Quand le flux
     *  d'évènements s'éteint (inertie comprise), si on s'est arrêté juste AVANT une
     *  pose, on y glisse en douceur — uniquement VERS L'AVANT, jamais pendant un
     *  geste, interrompu par tout nouvel input. */
    maybeSettle() {
      if (settleTimer) clearTimeout(settleTimer)
      if (gliding) return
      settleTimer = setTimeout(() => {
        settleTimer = 0
        if (gliding) return
        const total = getTotal()
        if (total <= 0) return
        const p = Math.min(1, Math.max(0, (window.scrollY - getOffsetTop()) / total))
        // pose la plus proche DEVANT nous, à portée de rattrapage. `p < t` exclut
        // d'office les plateaux (on y est déjà posé) et tout retour en arrière.
        const target = SETTLE_POSES.find((t) => p < t && t - p <= SETTLE_RANGE)
        if (target != null) runGlide(target, SETTLE_MS, easeOutCubic)
      }, SETTLE_IDLE_MS)
    },
    dispose() {
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('touchmove', onInput)
      if (settleTimer) clearTimeout(settleTimer)
      stopGlide()
    },
  }
}
