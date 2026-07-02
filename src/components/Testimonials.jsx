import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'
import { TESTIMONIALS, loc } from '../data/testimonials'

const ease = [0.22, 1, 0.36, 1]

// Repli quand aucune photo : initiales sur un disque (langage rubis).
function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/**
 * Témoignages — preuve sociale « ça change vraiment leur façon de vendre ».
 * Même langage que les Intégrations / l'Équipe (fond sombre, révélations
 * framer-motion), pour rester dans l'arc obscurité → lumière. Ancrée #testimonials.
 */
export default function Testimonials() {
  const { t, locale } = useI18n()
  const reduce = useReducedMotion()
  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }

  return (
    <section id="testimonials" className="relative overflow-hidden bg-night text-ink">
      <div className="thread-soft pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 opacity-40" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-32 text-center md:py-40">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15%' }}
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {t('testimonials.kicker')}
          </span>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] tracking-tight">
            {t('testimonials.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            {t('testimonials.subtitle')}
          </p>
        </motion.div>

        <motion.ul
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="mx-auto mt-14 grid max-w-4xl gap-6 text-left sm:grid-cols-2"
        >
          {TESTIMONIALS.map((p) => (
            <li
              key={p.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-colors hover:border-white/20"
            >
              <span aria-hidden="true" className="font-serif text-5xl leading-none text-ruby/60">
                “
              </span>
              <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed text-ink/90">
                {p.quote}
              </blockquote>

              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-6">
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-ruby/40"
                    style={{ boxShadow: '0 0 22px -10px var(--ruby-glow)' }}
                  />
                ) : (
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-ink ring-2 ring-ruby/40"
                    style={{
                      background:
                        'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%), radial-gradient(circle at 50% 60%, #c41230, #6e0a1c)',
                      boxShadow: '0 0 22px -10px var(--ruby-glow)',
                    }}
                  >
                    {initials(p.name)}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tracking-tight">{p.name}</p>
                  {p.role && <p className="text-xs text-muted">{loc(p.role, locale)}</p>}
                </div>
              </div>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
