import { motion, useReducedMotion } from 'framer-motion'
import { WaitlistForm } from './Waitlist'
import { useI18n } from '../i18n'

const ease = [0.22, 1, 0.36, 1]

// Étincelles rubis qui montent du bas de l'écran (poussière lumineuse de la
// grotte). Valeurs figées (pas de random au rendu) → aucun re-render, désynchro
// des boucles via durées/délais premiers entre eux.
const SPARKS = [
  { x: '6%', s: '3px', d: '11s', delay: '0s', sway: '22px' },
  { x: '16%', s: '2px', d: '14s', delay: '3.2s', sway: '-16px' },
  { x: '27%', s: '3px', d: '12s', delay: '6.1s', sway: '12px' },
  { x: '38%', s: '2px', d: '16s', delay: '1.4s', sway: '-24px' },
  { x: '52%', s: '4px', d: '13s', delay: '4.7s', sway: '18px' },
  { x: '63%', s: '2px', d: '15s', delay: '8.3s', sway: '-14px' },
  { x: '74%', s: '3px', d: '11.5s', delay: '2.6s', sway: '26px' },
  { x: '85%', s: '2px', d: '13.5s', delay: '5.9s', sway: '-20px' },
  { x: '93%', s: '3px', d: '12.5s', delay: '9.1s', sway: '14px' },
]

// ─────────────────────────────────────────────────────────────────────────────
// HERO TÉLÉPHONE — remplace UNIQUEMENT la scène 3D (le voyage dans la grotte).
//
// Un seul écran, mais l'esprit de la grotte en 2D : le poster (hero-first-frame,
// déjà préchargé par index.html → zéro requête en plus) en Ken Burns, l'orbe Ruby
// qui flotte avec son halo, des étincelles rubis qui montent — puis titre, une
// phrase de pitch et le formulaire waitlist inline. Le reste de la landing
// (overview, intégrations, équipe, CTA, footer) suit normalement (App.jsx).
// La sélection se fait dans App.jsx (PHONE) ; les modulepreload des chunks 3D
// sont aussi coupés sur téléphone (vite.config.js) → aucun octet de three.
//
// id="hero" : ScrollThread s'y accroche pour lire la progression du voyage — sur
// un hero d'un seul écran, il se masque tout seul.
//
// Ce module ne doit JAMAIS importer three (bundle eager, cf. mémoire
// « keep eager bundle three-free »).
// ─────────────────────────────────────────────────────────────────────────────
export default function MobileHero() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
  }
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
  }

  return (
    <section id="hero" className="relative flex min-h-svh w-full flex-col overflow-hidden">
      {/* décor : le poster de la grotte (image statique) + voile sombre pour la
          lisibilité — voile renforcé en bas pour fondre vers le pont narratif
          (#overview, #0b0b0d). */}
      <img
        src="/hero-first-frame.webp"
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover ${reduce ? '' : 'kenburns'}`}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(8,8,10,0.65) 0%, rgba(8,8,10,0.4) 45%, rgba(11,11,13,0.92) 100%)',
        }}
      />

      {/* étincelles rubis (masquées en reduced-motion : figées elles ne sont que du bruit) */}
      {!reduce && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {SPARKS.map((p) => (
            <span
              key={p.x}
              className="mh-spark"
              style={{ '--x': p.x, '--s': p.s, '--d': p.d, '--delay': p.delay, '--sway': p.sway }}
            />
          ))}
        </div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-24 text-center"
      >
        {/* l'orbe Ruby : elle « accueille » comme dans la grotte — halo qui respire,
            disque qui tourne sur lui-même, flottement doux. */}
        <motion.div variants={item} className={`relative mb-9 ${reduce ? '' : 'mh-float'}`}>
          <span className="mh-halo" aria-hidden="true" />
          <span className="mh-orb block" aria-hidden="true">
            <span className="ruby-orb-spin" />
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="max-w-xs text-balance text-[clamp(1.7rem,7vw,2.1rem)] font-medium leading-[1.12] tracking-tight"
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p variants={item} className="mt-4 max-w-[19rem] text-balance text-sm leading-relaxed text-muted">
          {t('mobile.pitch')}
        </motion.p>

        <motion.div variants={item} className="mt-8 w-full max-w-[19rem]">
          <WaitlistForm variant="inline" onDark />
          <p className="mt-3.5 text-xs text-ink/40">{t('cta.note')}</p>
        </motion.div>
      </motion.div>

      {/* indice de scroll : le fil rouge descend vers la suite de la page */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center" aria-hidden="true">
        <div className="thread-soft h-16 w-px" />
      </div>
    </section>
  )
}
