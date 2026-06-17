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
  const [use3D, setUse3D] = useState(false)
  const [inView, setInView] = useState(true)
  const [docVisible, setDocVisible] = useState(true)
  const sectionRef = useRef(null)

  useEffect(() => {
    if (reduce) return
    const mobile = window.matchMedia('(max-width: 768px)').matches
    if (!mobile) setUse3D(true)
  }, [reduce])

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
    <section ref={sectionRef} className="relative h-svh min-h-[36rem] w-full overflow-hidden">
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
              <CaveScene active={inView && docVisible} />
            </div>
          </Suspense>
        </Safe3D>
      )}

      {/* voile : sombre en haut (lisibilité header) + sombre en bas (texte),
          transparent au centre pour laisser briller le rubis */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0) 22%, rgba(8,8,10,0) 52%, rgba(8,8,10,0.85) 86%, #0b0b0d 100%)',
        }}
      />

      {/* contenu, ancré en bas */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col items-center justify-end px-6 pb-20 text-center md:pb-24">
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
            <a href="#reveal" className="text-sm text-muted transition-colors hover:text-ink">
              See how it works ↓
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
