import { motion, useReducedMotion } from 'framer-motion'
import Header from './components/Header'
import Hero from './components/Hero'
import ScrollThread from './components/ScrollThread'
import Integrations from './components/Integrations'
import Testimonials from './components/Testimonials'
import Team from './components/Team'
import Footer from './components/Footer'
import { WaitlistProvider, WaitlistModal, WaitlistForm } from './components/Waitlist'
import { LocaleProvider, useI18n } from './i18n'

const ease = [0.22, 1, 0.36, 1]

// ?capture : on masque le header + le fil narratif (UI HTML) pour les captures d'écran
// de la scène (scripts/shot-at.mjs) → on ne shoote QUE la 3D brute.
const CAPTURE = typeof window !== 'undefined' && window.location.search.includes('capture')

// LocaleProvider EST DANS App → main.jsx (client) ET prerender-home.mjs (SSR) en
// héritent sans rien changer. En SSR, detectLocale() → 'en' (pas de window) : le
// pré-rendu SEO reste anglais.
export default function App() {
  return (
    <LocaleProvider>
      <WaitlistProvider>
        <Landing />
        <WaitlistModal />
      </WaitlistProvider>
    </LocaleProvider>
  )
}

function Landing() {
  const { t } = useI18n()
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
              <p className="text-muted">{t('overview.0')}</p>
              <p className="text-muted">{t('overview.1')}</p>
              <p className="text-muted">{t('overview.2')}</p>
              <p>{t('overview.3')}</p>
              <p>{t('overview.4')}</p>
            </motion.div>
          </div>
        </section>

        {/* Intégrations — réassurance « ça marche avec ta stack » (le sales veut
            savoir si ça branche sur Zoom/Gong avant d'agir). Remplace les 3 sections
            produit qui répétaient mot pour mot les cartes 3D de la grotte. */}
        <Integrations />

        {/* Témoignages — la preuve sociale détaillée (citations complètes + cartes
            auteur). Le hero porte déjà la version courte EN TÊTE ; ici on développe,
            une fois la valeur posée (narration + stack), juste avant l'équipe. */}
        <Testimonials />

        {/* Team — qui construit Ruby (description, note, photo, LinkedIn, email).
            Placée AVANT le CTA pour rester dans le langage sombre ; le CTA garde
            la transition obscurité → lumière en clôture. */}
        <Team />

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
              {t('cta.title')}
            </motion.h2>
            <motion.div
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-10"
            >
              <WaitlistForm variant="inline" />
              <p className="mt-4 text-sm text-night/50">{t('cta.note')}</p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
