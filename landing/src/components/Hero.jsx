import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

export default function Hero() {
  const reduce = useReducedMotion()
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
    <section className="relative h-svh min-h-[36rem] w-full overflow-hidden">
      {/* image de marque plein écran — la grotte et son signal rouge.
          léger Ken Burns, désactivé en reduced-motion */}
      <img
        src="/hero-cave.jpg"
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover ${reduce ? '' : 'kenburns'}`}
      />

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
