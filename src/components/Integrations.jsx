import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'

const ease = [0.22, 1, 0.36, 1]

// Les outils avec lesquels Ruby se branche (cf. charte → ligne d'intégrations).
const TOOLS = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Gong', 'Modjo']

/**
 * Intégrations — la réassurance « ça marche avec ta stack » qui manquait au sales.
 * Sobre, dans le langage de lumière : fond sombre (continuité avec le pont),
 * wordmarks discrètes. Ancrée #integrations (lien du header).
 */
export default function Integrations() {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }

  return (
    <section id="integrations" className="relative overflow-hidden bg-night text-ink">
      <div className="thread-soft pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 opacity-40" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-32 text-center md:py-40">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15%' }}
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {t('integrations.kicker')}
          </span>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] tracking-tight">
            {t('integrations.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            {t('integrations.subtitle')}
          </p>
        </motion.div>

        <motion.ul
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-5"
        >
          {TOOLS.map((tool) => (
            <li
              key={tool}
              className="text-lg font-medium tracking-tight text-muted transition-colors hover:text-ink"
            >
              {tool}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
