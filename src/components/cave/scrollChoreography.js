// ─────────────────────────────────────────────────────────────────────────────
// DRAMATURGIE DU SCROLL — source unique de toute la séquence pilotée au scroll.
// Avant, la même chronologie était dupliquée à deux endroits qui devaient rester
// d'accord : le mapping scroll→scène (ScrollDriver, dans CaveScene) ET l'aimant
// de scroll (Hero). Ici tout part des MÊMES seuils (config.js) :
//   1. sampleTimeline(p)  : ce que la SCÈNE doit afficher pour une progression p
//   2. SNAP_STAGES        : les paliers où l'aimant emmène / bloque
//   3. createScrollMagnet : le contrôleur DOM qui exécute l'aimant
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
  } else if (p <= U_BREAK) {
    // BRIS : Ruby reste BLOQUÉ à l'écran ; la vidéo se brise (au scroll) jusqu'à 100%
    u = U_STOP
    brk = smooth01((p - U_HOLD) / (U_BREAK - U_HOLD))
  } else if (p <= S_CAVE_END) {
    // CROISIÈRE : profil TRAPÈZE avec kIn = 0 → PLEINE VITESSE dès le bris (plus de
    // rampe d'accélération lente : la caméra colle à la vitesse de scroll tout de
    // suite ; le lissage dampN absorbe le à-coup). kOut = 0.18 → arrêt doux au bout
    // de grotte (la fin que tu aimes).
    brk = 1
    u = U_STOP + trapezoidEase((p - U_BREAK) / (S_CAVE_END - U_BREAK), 0, 0.18) * (U_END - U_STOP)
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

// ── AIMANT MULTI-ÉTAPES ───────────────────────────────────────────────────────
// À chaque swipe, l'aimant prolonge le geste jusqu'à la cible de l'étape courante.
// `from`/`to` sont des progressions p. CLÉ : l'aimant ne s'arme qu'APRÈS `from`,
// donc chaque `from` est placé à la FIN d'une pause de lecture → l'utilisateur peut
// scroller librement DANS la pause (zone morte) avant d'être happé vers la suite.
//  1) seuil BAS exprès → suffit du 1er coup → vidéo plein cadre.
//  2) `from` = fin de la PAUSE vidéo (U_HOLD) → traverse le bris et descend au bout
//     de grotte (msg 1). Laisse la vélocité s'établir avant la prise de l'aimant.
//  3) `from` = fin de la PAUSE msg 1 (S_MSG_HOLD, pas S_CAVE_END) → on s'arrête
//     VRAIMENT sur le 1er message, puis ce swipe remonte et BLOQUE devant le msg 2.
//  4) `from` = fin du PALIER msg 2 (S_EXIT_HOLD) → on émerge et BLOQUE sur le lac.
export const SNAP_STAGES = [
  { from: U_ARRIVE * 0.06, to: U_ARRIVE },
  { from: U_HOLD, to: S_CAVE_END },
  { from: S_MSG_HOLD, to: S_EXIT_RISE },
  { from: S_EXIT_HOLD, to: S_EXIT_END },
]

// VITESSE DE L'AIMANT : la durée PROLONGE le geste (durée ∝ distance / vélocité)
// au lieu d'une durée arbitraire. Bornes LARGES → c'est bien la vélocité du user
// qui pilote (sauf cas extrêmes).
const SNAP_MIN_MS = 200 // jamais un saut instantané
const SNAP_MAX_MS = 3800 // approche au ralenti → la longue croisière RESPIRE (était 2600,
// catapultait le visiteur sur les grandes traversées → on profite de l'immersion)
// >1 = l'aimant va PLUS vite que le swipe (emmène franchement), <1 = plus posé.
const SNAP_SPEED_GAIN = 0.42 // un peu plus posé (était 0.5)
// MAINTIEN APRÈS SNAP : une fois la pose atteinte, on la PIN (scrollTo chaque frame)
// tant que l'utilisateur n'a pas relâché — c.-à-d. plus aucun input wheel/touch
// depuis RELEASE_IDLE_MS. Sinon l'INERTIE d'un 2e swipe (ou d'un fling) traverse le
// palier juste après le snap et on saute le message sans s'arrêter. Plafonné par
// MAX_HOLD_MS (garde-fou : un drag continu très long finit par être relâché).
const RELEASE_IDLE_MS = 110
const MAX_HOLD_MS = 1500

/** Contrôleur DOM de l'aimant. Mesure la vélocité de scroll et, quand on entre
 *  vers l'avant dans la plage ]from, to[ d'une étape, anime window.scrollY jusqu'à
 *  la cible (vitesse constante = celle du swipe × gain), PUIS maintient la pose le
 *  temps que l'inertie meure. Ne touche QUE window.scrollY.
 *
 *  - getTotal()     : course de scroll de la section hero (offsetHeight - innerHeight)
 *  - getOffsetTop() : décalage haut de la section dans la page
 *
 *  À câbler : trackVelocity() sur chaque évènement scroll, maybeSnap(p) à chaque
 *  frame d'update, dispose() au démontage. */
export function createScrollMagnet({ getTotal, getOffsetTop }) {
  let vel = 0 // px/ms (signé), lissé en EMA
  let lastY = window.scrollY
  let lastT = performance.now()
  let snapping = false // animation d'aimant en cours
  let holding = false // maintien de la pose après l'aimant (absorbe l'inertie)
  let snapRaf = 0
  let snapDoneTarget = null // cible de la dernière étape résolue (ne pas re-happer)
  let lastInputT = 0 // horodatage du dernier input UTILISATEUR (wheel/touch)

  // SEUL l'input direct (wheel/touch) date un « geste » ; nos scrollTo de pin ne
  // déclenchent PAS ces évènements → on distingue l'inertie qui meurt (plus d'input)
  // de notre propre maintien.
  const onInput = () => {
    lastInputT = performance.now()
  }
  window.addEventListener('wheel', onInput, { passive: true })
  window.addEventListener('touchmove', onInput, { passive: true })

  // étape active = la 1re dont la cible est encore DEVANT nous (pas atteinte)
  const findStage = (p) => SNAP_STAGES.find((s) => p < s.to - 0.005) ?? null

  // fin de la prise en main (snap + maintien) : on relâche le scroll au user, en
  // remettant à zéro la mesure de vélocité (sinon le swipe SUIVANT calcule une
  // vélocité aberrante → l'aimant d'après part en vrille).
  const release = (snapTo) => {
    snapping = false
    holding = false
    snapRaf = 0
    snapDoneTarget = snapTo // désarme cette étape (la suivante s'armera au swipe suivant)
    vel = 0
    lastY = window.scrollY
    lastT = performance.now()
  }

  const runSnap = (snapTo, maxMs = SNAP_MAX_MS) => {
    const total = getTotal()
    if (total <= 0) return
    const targetY = getOffsetTop() + snapTo * total
    const startY = window.scrollY
    const dist = targetY - startY
    if (Math.abs(dist) < 1) {
      snapDoneTarget = snapTo
      return
    }
    // durMs = distance / vitesse (px / (px/ms) = ms) ; mouvement LINÉAIRE → pas de
    // décélération en fin de course, on prolonge le geste tel quel jusqu'à la cible.
    // `maxMs` plafonne la durée : par défaut SNAP_MAX_MS (croisière qui respire), mais
    // un appel programmatique (ex. « Break through ») peut le baisser pour aller vite.
    const speed = Math.max(Math.abs(vel) * SNAP_SPEED_GAIN, 0.05) // px/ms (évite /0)
    const durMs = Math.min(maxMs, Math.max(SNAP_MIN_MS, Math.abs(dist) / speed))
    const t0 = performance.now()
    snapping = true
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / durMs)
      window.scrollTo(0, startY + dist * k)
      if (k < 1) {
        snapRaf = requestAnimationFrame(step)
        return
      }
      // arrivé sur la pose → MAINTIEN : on pin jusqu'à ce que l'utilisateur ait
      // relâché (inertie morte). L'inertie d'un 2e swipe est ainsi absorbée ICI au
      // lieu de nous faire traverser le palier et sauter le message.
      snapping = false
      holding = true
      const holdStart = performance.now()
      const hold = () => {
        window.scrollTo(0, targetY) // pin sur la pose
        const now = performance.now()
        const released = now - lastInputT > RELEASE_IDLE_MS // plus d'input = inertie morte
        if (released || now - holdStart > MAX_HOLD_MS) {
          release(snapTo)
          return
        }
        snapRaf = requestAnimationFrame(hold)
      }
      hold()
    }
    step()
  }

  return {
    /** mesure la vélocité de scroll (ignorée pendant snap/maintien, où c'est NOUS qui scrollons) */
    trackVelocity() {
      if (snapping || holding) return
      const now = performance.now()
      const y = window.scrollY
      const dt = now - lastT
      if (dt > 0) {
        vel = vel * 0.65 + ((y - lastY) / dt) * 0.35 // lissage EMA
        lastY = y
        lastT = now
      }
    },
    /** Déclenche PROGRAMMATIQUEMENT le glissement vers une progression cible (ex. :
     *  clic « Suis-moi » → on glisse jusqu'à la vidéo démo). Réutilise runSnap (donc
     *  aussi le maintien anti-inertie). `speed` en px/ms = vitesse du glissement. */
    snapTo(targetP, speed = 0.45, maxMs = SNAP_MAX_MS) {
      if (snapping || holding) return
      vel = Math.max(speed, 0.05)
      snapDoneTarget = null
      runSnap(targetP, maxMs)
    },
    /** déclenche l'aimant si on entre vers l'avant dans la plage d'une étape */
    maybeSnap(p) {
      if (snapping || holding) return // prise en main en cours → on ne re-déclenche pas
      const s = findStage(p)
      if (!s) return
      if (p < s.from) snapDoneTarget = null // ré-armement de cette étape (retour en arrière)
      // GATE SUR LE SENS : ne happe QUE vers l'avant (vel > 0 = scroll vers le bas).
      // Sinon, en swipant vers le HAUT on reste dans ]from, to[ et l'aimant se
      // re-déclenche → « roll back » qui renvoie vers l'avant et empêche de remonter.
      if (snapDoneTarget !== s.to && p > s.from && p < s.to && vel > 0) runSnap(s.to)
    },
    dispose() {
      window.removeEventListener('wheel', onInput)
      window.removeEventListener('touchmove', onInput)
      if (snapRaf) cancelAnimationFrame(snapRaf)
    },
  }
}
