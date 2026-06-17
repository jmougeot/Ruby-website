import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from 'framer-motion'
import RedThread from './RedThread'

const ease = [0.22, 1, 0.36, 1]

/**
 * Sous le hero vidéo : le placeholder de la vidéo DÉMO produit (qui grossit
 * au scroll) + la ligne d'intégrations. Le fil rouge naît ici et descend.
 */
export default function DemoShowcase() {
  const reduce = useReducedMotion()

  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  })
  const rawScale = useTransform(scrollYProgress, [0, 1], [0.82, 1])
  const scale = useSpring(rawScale, { stiffness: 120, damping: 30, mass: 0.4 })

  return (
    <section className="relative overflow-hidden bg-night">
      <RedThread />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 pb-24 pt-24">
        {/* cadre démo produit — "le trou" propre, qui grossit au scroll */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 1, ease }}
          className="relative mx-auto w-full max-w-5xl"
        >
          <motion.div style={reduce ? undefined : { scale }} className="relative origin-center">
            <div className="video-glow pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ruby/30 blur-[80px]" />
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-night">
              {reduce ? (
                <img
                  src="/ruby-hero-poster.jpg"
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/ruby-hero-poster.jpg"
                  aria-hidden="true"
                >
                  <source src="/ruby-hero.mp4" type="video/mp4" />
                </video>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* intégrations */}
        <div className="mt-14 flex flex-col items-center gap-4">
          <span className="text-xs uppercase tracking-[0.18em] text-muted/70">Works with</span>
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-muted">
            <span>Zoom</span>
            <Dot />
            <span>Google Meet</span>
            <Dot />
            <span>Teams</span>
            <Dot />
            <span>Gong</span>
            <Dot />
            <span>Modjo</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Dot() {
  return <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted/40" />
}
