import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { U_ARRIVE, U_HOLD, S_CAVE_END, S_EXIT_RISE, S_EXIT_HOLD, S_EXIT_END } from './cave/config'

const CaveScene = lazy(() => import('./CaveScene'))
const ease = [0.22, 1, 0.36, 1]

// debug : ?debug=lake fige la scène sur le LAC et masque les calques d'UI (image
// de repli, voile, texte) → on voit la 3D brute (mise au point du décor montagne).
const DEBUG_LAKE =
  typeof window !== 'undefined' && window.location.search.includes('debug=lake')

/** Si la 3D plante (WebGL absent, etc.), on retombe sur l'image. */
class Safe3D extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function Hero() {
  const reduce = useReducedMotion()
  // décidé SYNCHRONIQUEMENT au 1er rendu → la hauteur de section est stable,
  // pas de saut de scroll quand la 3D s'affiche ensuite
  const [use3D] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      !window.matchMedia('(max-width: 768px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  })
  const [inView, setInView] = useState(true)
  const [docVisible, setDocVisible] = useState(true)
  const sectionRef = useRef(null)
  const overlayRef = useRef(null)
  const progress = useRef(0) // 0→1 sur toute la hauteur du hero (piloté par le scroll)

  // fige le rendu 3D dès que le hero sort de l'écran (gros gain de perf)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.01,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // fige aussi le rendu quand l'onglet n'est pas visible
  useEffect(() => {
    const onVis = () => setDocVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // progression du scroll DANS le hero → pilote l'avancée du rubis (via progress ref)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const total = el.offsetHeight - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0
      progress.current = p
      // le texte du hero descend (scroll vers le bas) à mesure qu'on entre dans la grotte
      if (overlayRef.current) {
        const q = Math.min(1, Math.max(0, p / 0.1)) // 0→1 sur le tout début (≈1,5 écran)
        const down = q * window.innerHeight * 0.9 // glisse vers le bas, hors écran
        // léger fondu seulement sur la toute fin pour éviter un bord net
        const fade = Math.min(1, Math.max(0, 1 - (q - 0.7) / 0.3))
        overlayRef.current.style.opacity = String(fade)
        overlayRef.current.style.transform = `translateY(${down}px)`
        overlayRef.current.style.pointerEvents = q > 0.95 ? 'none' : 'auto'
      }
      // AIMANT MULTI-ÉTAPES : chaque swipe happe vers la cible de l'étape courante.
      // Se ré-arme si on repasse SOUS le seuil d'une étape (retour en arrière) → il
      // happe à chaque approche, mais ne piège pas une fois l'étape franchie.
      const s = findStage(p)
      if (s) {
        if (p < s.from) snapDoneTarget = null // ré-armement de cette étape
        if (!snapping && snapDoneTarget !== s.to && p > s.from && p < s.to) runSnap(s.to)
      }
    }
    // ── AIMANT vers la vidéo démo ──────────────────────────────────────────
    // Dès qu'on ENTRE dans la zone d'approche, la page est happée jusqu'à la vidéo
    // (p = U_ARRIVE) et l'aimant PREND LA MAIN : il ne se laisse pas annuler par le
    // scroll (chaque frame il re-tire vers la cible). Il se désarme à l'arrivée →
    // ensuite scroll libre, pas de piège.
    // ÉTAPES : à chaque swipe, l'aimant emmène vers la cible suivante.
    //  1) 1er swipe (seuil BAS exprès → suffit du premier coup) → vidéo plein cadre.
    //  2) 2e swipe → traverse le BRIS (vidéo cassée proprement) et descend jusqu'au
    //     BAS DU TROU (S_CAVE_END), juste avant la remontée verticale.
    // `from` de l'étape 2 = FIN de la pause (U_HOLD) : on laisse le user swiper
    // librement sur la pause (Ruby figé sur la vidéo) → sa vitesse a le temps de
    // s'établir, et l'aimant prend la main À CETTE vitesse (au lieu de ramper
    // depuis vel≈0 s'il s'armait juste après la vidéo).
    const SNAP_STAGES = [
      { from: U_ARRIVE * 0.06, to: U_ARRIVE },
      { from: U_HOLD, to: S_CAVE_END },
      // 3) sortie de la grotte : on remonte et l'aimant BLOQUE devant le message
      //    (palier dans le puits, avant le lac).
      { from: S_CAVE_END, to: S_EXIT_RISE },
      // 4) dernier swipe → on émerge et l'aimant BLOQUE sur le lac.
      { from: S_EXIT_HOLD, to: S_EXIT_END },
    ]
    // étape active = la 1re dont la cible est encore DEVANT nous (pas atteinte).
    const findStage = (p) => SNAP_STAGES.find((s) => p < s.to - 0.005) ?? null
    let snapRaf = 0
    let snapping = false
    let snapDoneTarget = null // cible de la dernière étape résolue (ne pas re-happer)

    // VITESSE DU USER : on mesure la vélocité de scroll (px/ms, lissée) pour en
    // déduire la durée de l'aimant → il PROLONGE le geste au lieu d'une durée au
    // hasard. Bornée [MIN, MAX] : jamais un saut instantané (seuil mini) ni une
    // éternité si on approche au ralenti (seuil maxi).
    let vel = 0 // px/ms (signé), lissé en EMA
    let lastY = window.scrollY
    let lastT = performance.now()
    // bornes LARGES : si le max est trop bas, il écrase le calcul et force une
    // vitesse > celle du user. On les garde permissives pour que ce soit bien la
    // vélocité qui pilote (sauf cas extrêmes).
    const SNAP_MIN_MS = 200 // jamais un saut instantané
    const SNAP_MAX_MS = 2600 // approche au ralenti → se résout quand même
    // FACTEUR DE VITESSE : >1 = l'aimant va PLUS vite que le swipe (emmène
    // franchement vers la vidéo), <1 = plus posé. C'est le « speed à définir ».
    const SNAP_SPEED_GAIN = 0.5
    const runSnap = (snapTo) => {
      const total = el.offsetHeight - window.innerHeight
      if (total <= 0) return
      const targetY = el.offsetTop + snapTo * total
      const startY = window.scrollY
      const dist = targetY - startY
      if (Math.abs(dist) < 1) {
        snapDoneTarget = snapTo
        return
      }
      // VITESSE CONSTANTE = celle du swipe (× gain). Mouvement LINÉAIRE → on ne
      // ralentit PAS à l'arrivée : on prolonge le geste tel quel jusqu'à la vidéo.
      // durMs = distance / vitesse (px / (px/ms) = ms).
      const speed = Math.max(Math.abs(vel) * SNAP_SPEED_GAIN, 0.05) // px/ms (évite /0)
      const durMs = Math.min(SNAP_MAX_MS, Math.max(SNAP_MIN_MS, Math.abs(dist) / speed))
      const t0 = performance.now()
      snapping = true
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / durMs)
        // LINÉAIRE : vitesse constante, pas de décélération en fin de course.
        const e = k
        window.scrollTo(0, startY + dist * e)
        if (k >= 1) {
          snapping = false
          snapRaf = 0
          snapDoneTarget = snapTo // désarme cette étape (la suivante s'armera au swipe suivant)
          // RAZ de la mesure de vélocité : pendant le snap, lastY/lastT n'ont pas
          // été mis à jour (gros déplacement ignoré) → sans ça, le swipe SUIVANT
          // calcule une vélocité aberrante et l'aimant d'après part en vrille.
          vel = 0
          lastY = window.scrollY
          lastT = performance.now()
          return
        }
        snapRaf = requestAnimationFrame(step)
      }
      step()
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
      if (snapping) return // pendant l'aimant c'est NOUS qui scrollons → on ignore
      const now = performance.now()
      const y = window.scrollY
      const dt = now - lastT
      if (dt > 0) {
        vel = vel * 0.65 + ((y - lastY) / dt) * 0.35 // lissage EMA de la vélocité
        lastY = y
        lastT = now
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (snapRaf) cancelAnimationFrame(snapRaf)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const y = reduce ? 0 : 18
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
  }
  const item = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
  }

  return (
    // section haute (3D) : la hauteur sert de "course" de scroll pour traverser
    // la grotte. Sans 3D (mobile/reduced-motion), hauteur d'écran normale.
    <section ref={sectionRef} className={`relative w-full ${use3D ? 'h-[1620vh]' : 'h-svh min-h-[36rem]'}`}>
      {/* tout est épinglé à l'écran pendant qu'on défile la section */}
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/* image = base + repli (mobile / reduced-motion / pendant le chargement 3D) */}
        <img
          src="/hero-cave.jpg"
          alt=""
          aria-hidden="true"
          style={DEBUG_LAKE ? { display: 'none' } : undefined}
          className={`absolute inset-0 h-full w-full object-cover ${reduce ? '' : 'kenburns'}`}
        />

        {/* grotte 3D par-dessus, sur desktop capable */}
        {use3D && (
          <Safe3D>
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <CaveScene active={inView && docVisible} scroll={progress} />
              </div>
            </Suspense>
          </Safe3D>
        )}

        {/* voile : sombre en haut (lisibilité header) + sombre en bas (texte) */}
        {!DEBUG_LAKE && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0) 22%, rgba(8,8,10,0) 52%, rgba(8,8,10,0.85) 86%, #0b0b0d 100%)',
          }}
        />
        )}

        {/* contenu du hero, ancré en bas, qui s'efface au scroll */}
        <div
          ref={overlayRef}
          style={DEBUG_LAKE ? { display: 'none' } : undefined}
          className="absolute inset-0 z-10 mx-auto flex max-w-[1400px] flex-col items-center justify-end px-6 pb-20 text-center md:pb-24"
        >
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center">
            <motion.span
              variants={item}
              className="mb-5 text-xs font-medium uppercase tracking-[0.22em] text-muted"
            >
              Sales intelligence
            </motion.span>

            <motion.h1
              variants={item}
              className="max-w-3xl text-balance text-[clamp(2.5rem,6.5vw,4.75rem)] font-medium leading-[1.05] tracking-tight"
            >
              Become an AI-augmented sales rep.
            </motion.h1>

            <motion.p variants={item} className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Ruby listens to every conversation, finds what you&rsquo;re missing, and helps you
              get better after every call.
            </motion.p>

            <motion.div variants={item} className="mt-9 flex flex-col items-center gap-4">
              <a
                href="#demo"
                className="rounded-full bg-ruby px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_0_30px_-6px_var(--ruby-glow)] transition-shadow hover:shadow-[0_0_44px_-4px_var(--ruby-glow)]"
              >
                Book a demo
              </a>
              <span className="text-sm text-muted">Scroll to follow Ruby ↓</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
