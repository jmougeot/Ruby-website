import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const CaveScene = lazy(() => import('./CaveScene'))
const ease = [0.22, 1, 0.36, 1]

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
        const q = Math.min(1, Math.max(0, p / 0.16)) // 0→1 sur le tout début
        const down = q * window.innerHeight * 0.9 // glisse vers le bas, hors écran
        // léger fondu seulement sur la toute fin pour éviter un bord net
        const fade = Math.min(1, Math.max(0, 1 - (q - 0.7) / 0.3))
        overlayRef.current.style.opacity = String(fade)
        overlayRef.current.style.transform = `translateY(${down}px)`
        overlayRef.current.style.pointerEvents = q > 0.95 ? 'none' : 'auto'
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
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
    <section ref={sectionRef} className={`relative w-full ${use3D ? 'h-[720vh]' : 'h-svh min-h-[36rem]'}`}>
      {/* tout est épinglé à l'écran pendant qu'on défile la section */}
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/* image = base + repli (mobile / reduced-motion / pendant le chargement 3D) */}
        <img
          src="/hero-cave.jpg"
          alt=""
          aria-hidden="true"
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
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0) 22%, rgba(8,8,10,0) 52%, rgba(8,8,10,0.85) 86%, #0b0b0d 100%)',
          }}
        />

        {/* contenu du hero, ancré en bas, qui s'efface au scroll */}
        <div
          ref={overlayRef}
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
