import { motion, useReducedMotion } from 'framer-motion'
import Header from './components/Header'
import Hero from './components/Hero'
import ScrollThread from './components/ScrollThread'
import Integrations from './components/Integrations'
import Footer from './components/Footer'

const ease = [0.22, 1, 0.36, 1]

// ?capture : on masque le header + le fil narratif (UI HTML) pour les captures d'écran
// de la scène (scripts/shot-at.mjs) → on ne shoote QUE la 3D brute.
const CAPTURE = typeof window !== 'undefined' && window.location.search.includes('capture')

export default function App() {
  const reduce = useReducedMotion()
  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }

  return (
    <>
      {!CAPTURE && <Header />}
      {!CAPTURE && <ScrollThread />}
      <main>
        <Hero />

        {/* PONT NARRATIF — la narration (problème → Ruby) lue AU CALME, entre le voyage
            de la grotte et les sections produit. C'est ICI que vivent les 5 lignes,
            plus en sous-titres qui défilaient (illisibles) dans la grotte. */}
        <section id="overview" className="bg-[#0b0b0d] text-ink">
          <div className="mx-auto max-w-2xl px-6 py-40 text-center md:py-52">
            <motion.div
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-15%' }}
              className="space-y-6 text-balance text-[clamp(1.5rem,3.2vw,2.25rem)] font-medium leading-snug tracking-tight"
            >
              <p className="text-muted">You know you can improve</p>
              <p className="text-muted">The hard part is knowing where to focus</p>
              <p className="text-muted">And finding the time to do something about it.</p>
              <p>Ruby shows you the way forward.</p>
              <p>Turn improvements into habits, and habits into deals.</p>
            </motion.div>
          </div>
        </section>

        {/* Intégrations — réassurance « ça marche avec ta stack » (le sales veut
            savoir si ça branche sur Zoom/Gong avant d'agir). Remplace les 3 sections
            produit qui répétaient mot pour mot les cartes 3D de la grotte. */}
        <Integrations />

        {/* CTA final — on boucle sur la promesse du hero, émergence dans la clarté
            (dégradé sombre → #f8f8f6 pour prolonger l'arc obscurité → lumière). */}
        <section
          id="demo"
          className="relative overflow-hidden"
          style={{ background: 'linear-gradient(to bottom, #0b0b0d 0px, #cfcfce 110px, #f8f8f6 200px)' }}
        >
          <div className="thread-soft pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 opacity-50" />
          <div className="relative z-10 mx-auto max-w-[1400px] px-6 pb-40 pt-52 text-center">
            <motion.h2
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-15%' }}
              className="mx-auto max-w-3xl text-balance text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-tight text-night"
            >
              Become the sales rep you know you can be.
            </motion.h2>
            <motion.div
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-10"
            >
              <a
                href="https://app.rubysignal.com"
                className="inline-block rounded-full bg-ruby px-8 py-4 text-[15px] font-medium text-white shadow-[0_0_40px_-6px_var(--ruby-glow)] transition-shadow hover:shadow-[0_0_52px_-4px_var(--ruby-glow)]"
              >
                Try it for free
              </a>
              <p className="mt-4 text-sm text-night/50">Free to get started — no credit card.</p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
