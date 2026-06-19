import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Écran de chargement — fond profond, rubis de marque, anneau de progression.
 *
 * COMPTEUR — le NOMBRE avance de 1 en 1 (chiffre par chiffre) tandis que
 * l'ANNEAU et le halo glissent en CONTINU (sous-pourcent) → rendu fluide. Calé
 * sur le TEMPS RÉEL (performance.now) : durée fiable même si le thread principal
 * est saturé par le chargement 3D (on rattrape au lieu de dériver).
 *   1. 0 → 90 % en ~1,5 s,
 *   2. puis crawl lent 90 → 99 % tant que la 3D n'est pas prête,
 *   3. dès que `ready` (1re image rendue), course jusqu'à 100 % → fermeture.
 *
 * L'animation est pilotée en IMPÉRATIF (refs) dans la boucle rAF : AUCUN
 * re-render par frame → fluide et sans concurrence avec l'init 3D. React ne
 * re-render qu'à la toute fin (bounce de la gemme + fermeture).
 */
const ease = [0.22, 1, 0.36, 1]
const MIN_MS = 500 // durée d'affichage mini (anti-flash)
const SAFETY_MS = 15000 // sécurité absolue si `ready` n'arrive jamais (WebGL KO)
const GEM_CLIP = 'polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)'

const FILL_MS = 1500 // 0→90 % (calé sur le TEMPS RÉEL, pas sur le nb de frames)
const SLOW_MS = 300 // crawl 90→99 % : ms par pourcent (« ça ralentit »)
const RUSH_MS = 10 // course → 100 % dès que `ready` : ms par pourcent
const STEP = 3 // le NOMBRE affiché saute par paliers de STEP % (l'anneau, lui, glisse en continu)

// valeur (float) du compteur selon le temps écoulé, hors « course ».
const fill = (elapsed) =>
  elapsed < FILL_MS
    ? (elapsed / FILL_MS) * 90
    : Math.min(99, 90 + (elapsed - FILL_MS) / SLOW_MS)

// nombre affiché : quantifié par paliers de STEP %, mais 100 pile à la fin
// (90 et 99 sont multiples de 3 → les transitions de phase tombent juste).
const fmt = (v) => (v >= 100 ? 100 : Math.floor(v / STEP) * STEP)

// géométrie de l'anneau (module-scope → réutilisée dans la boucle rAF)
const SIZE = 168
const STROKE = 2.5
const R = (SIZE - STROKE) / 2 - 4
const C = 2 * Math.PI * R
const halo = (p) => `radial-gradient(circle, rgba(255,77,90,${0.05 + 0.13 * p}) 0%, rgba(255,77,90,0) 60%)`

export default function RubyLoader({ ready = false }) {
  const [done, setDone] = useState(false)
  const [complete, setComplete] = useState(false) // déclenche le bounce final de la gemme
  const mountedAt = useRef(performance.now())
  const readyRef = useRef(ready)
  readyRef.current = ready // lu en direct par la boucle (sans la relancer)

  const vRef = useRef(0) // valeur courante (float) — source de vérité de l'anim
  const numRef = useRef(null)
  const arcRef = useRef(null)
  const haloRef = useRef(null)

  // ── boucle d'animation : maj IMPÉRATIVE de l'anneau / du halo / du nombre.
  // L'anneau glisse en continu ; le nombre est arrondi (1 en 1). Aucun setState
  // par frame → fluide même pendant que la 3D charge.
  useEffect(() => {
    if (done) return
    let raf
    let closeT
    const start = performance.now()
    let rushV = 0 // valeur de départ de la course
    let rushT = 0 // instant où `ready` est passé à true (0 = pas encore)
    const tick = (now) => {
      const elapsed = now - start
      let v
      if (readyRef.current) {
        if (!rushT) {
          rushT = now
          rushV = fill(elapsed)
        }
        v = rushV + (now - rushT) / RUSH_MS // +1 tous les RUSH_MS
      } else {
        v = fill(elapsed)
      }
      v = Math.min(100, v)
      vRef.current = v
      const p = v / 100
      if (numRef.current) numRef.current.textContent = `${fmt(v)}%`
      if (arcRef.current) arcRef.current.style.strokeDashoffset = `${C * (1 - p)}`
      if (haloRef.current) haloRef.current.style.background = halo(p)
      if (v >= 100) {
        setComplete(true)
        const wait = Math.max(0, MIN_MS - (now - mountedAt.current))
        closeT = setTimeout(() => setDone(true), wait)
        return // course terminée → on arrête la boucle
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(closeT)
    }
  }, [done])

  // sécurité absolue.
  useEffect(() => {
    const t = setTimeout(() => setDone(true), SAFETY_MS)
    return () => clearTimeout(t)
  }, [])

  // ── blocage du scroll tant que le loader est affiché.
  useEffect(() => {
    if (done) return
    const body = document.body.style.overflow
    const html = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => {
      document.body.style.overflow = body
      document.documentElement.style.overflow = html
    }
  }, [done])

  // snapshot lu par les (rares) re-renders → cohérent avec l'état impératif,
  // donc pas de « flash » quand React re-render (complete / sortie).
  const p0 = vRef.current / 100

  return createPortal(
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease }}
          style={{ willChange: 'opacity' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#070709]"
        >
          {/* halo ambiant : s'intensifie en CONTINU (piloté en impératif) */}
          <div
            ref={haloRef}
            className="pointer-events-none absolute"
            style={{ width: '46rem', height: '46rem', background: halo(p0) }}
          />
          <div className="grain pointer-events-none absolute inset-0" />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="relative flex flex-col items-center"
          >
            {/* anneau de progression + rubis au centre */}
            <div className="relative" style={{ width: SIZE, height: SIZE }}>
              <svg width={SIZE} height={SIZE} className="-rotate-90">
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={STROKE}
                />
                <circle
                  ref={arcRef}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="url(#ruby-arc)"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - p0)}
                  style={{ filter: 'drop-shadow(0 0 5px rgba(255,77,90,0.55))', willChange: 'stroke-dashoffset' }}
                />
                <defs>
                  <linearGradient id="ruby-arc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9c1027" />
                    <stop offset="55%" stopColor="#ff4d5a" />
                    <stop offset="100%" stopColor="#ff97a0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* contenu centré (non tourné) : gemme + pourcentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <motion.div
                  animate={complete ? { scale: [1, 1.16, 1] } : { scale: 1 }}
                  transition={{ duration: 0.55, ease }}
                >
                  <div className="gem h-11 w-11" style={{ clipPath: GEM_CLIP }} />
                </motion.div>
                <span
                  ref={numRef}
                  className="text-[13px] font-medium tabular-nums tracking-wide text-white/90"
                >
                  {fmt(p0 * 100)}%
                </span>
              </div>
            </div>

            {/* marque */}
            <span className="mt-8 text-sm font-semibold uppercase tracking-[0.42em] text-white/85">
              Ruby
            </span>
            <span className="mt-2.5 text-[10px] uppercase tracking-[0.28em] text-white/30">
              Sales intelligence
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
