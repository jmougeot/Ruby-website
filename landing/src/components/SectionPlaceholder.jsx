import { motion, useReducedMotion } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1]

/**
 * Section narrative générique. Le hero est entièrement construit ;
 * ces sections affichent leur copy réelle + un cadre "payoff" en attente
 * du vrai bout de produit (transcript / carte coaching / courbe).
 *
 * `background` = segment du dégradé continu noir → clair (cf. sections.js).
 * Dans la zone sombre, des halos lumineux ("signaux") apparaissent au scroll.
 */
export default function SectionPlaceholder({ id, eyebrow, title, copy, payoff, tone = 'dark', background }) {
  const reduce = useReducedMotion()
  const light = tone === 'light'

  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }

  return (
    <section
      id={id}
      style={{ background }}
      className={`relative overflow-hidden ${light ? 'text-night' : 'text-ink'}`}
    >
      {/* éléments lumineux qui apparaissent (uniquement dans la zone sombre) */}
      {!light && (
        <>
          <Glow className="left-[6%] top-[16%] h-72 w-72" color="rgba(255,77,90,0.16)" />
          <Glow className="right-[8%] bottom-[12%] h-80 w-80" color="rgba(255,255,255,0.05)" />
          <div className="thread-soft pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2" />
        </>
      )}

      <div
        className={`relative z-10 mx-auto max-w-[1400px] px-6 pb-32 ${light ? 'pt-56 md:pt-64' : 'pt-32'}`}
      >
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15%' }}
          className="mx-auto max-w-2xl text-center"
        >
          <span
            className={`text-xs font-medium uppercase tracking-[0.2em] ${light ? 'text-night/50' : 'text-muted'}`}
          >
            {eyebrow}
          </span>
          <h2 className="mt-5 text-balance text-[clamp(2rem,4.5vw,3rem)] font-medium leading-[1.1] tracking-tight">
            {title}
          </h2>
          <p
            className={`mx-auto mt-6 max-w-xl text-lg leading-relaxed ${light ? 'text-night/60' : 'text-muted'}`}
          >
            {copy}
          </p>
        </motion.div>

        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="mx-auto mt-14 max-w-3xl"
        >
          <div
            className={`grid aspect-[16/10] place-items-center rounded-2xl border ${
              light ? 'border-night/10 bg-white' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <span className={`px-6 text-center text-sm ${light ? 'text-night/40' : 'text-muted/60'}`}>
              ⟶ Payoff : {payoff}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/** Halo lumineux qui émerge au scroll (positionné sans translate pour ne pas
 *  entrer en conflit avec le transform animé par Framer). */
function Glow({ className, color }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-20%' }}
      transition={{ duration: 1.8, ease: 'easeOut' }}
      className={`pointer-events-none absolute rounded-full blur-[110px] ${className}`}
      style={{ background: color }}
    />
  )
}
