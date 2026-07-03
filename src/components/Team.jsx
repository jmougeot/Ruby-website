import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'

const ease = [0.22, 1, 0.36, 1]

// Champ membre localisé : accepte une chaîne simple OU { en, fr }. Permet d'écrire
// rôle/note dans les deux langues sans casser les entrées laissées en texte brut.
const loc = (val, locale) => (val && typeof val === 'object' ? val[locale] ?? val.en : val)

// ─────────────────────────────────────────────────────────────────────────────
// L'ÉQUIPE — à éditer ici. Une entrée = une carte (photo, rôle, note, liens).
//
//  • photo    : dépose le fichier dans /public/team/ (ex. /public/team/jacques.webp)
//               puis mets le chemin "/team/jacques.webp". Laisse "" → repli initiales.
//  • note     : 1–2 phrases, ce sur quoi la personne travaille / sa patte.
//  • linkedin : URL complète (https://www.linkedin.com/in/…). Laisse "" → masqué.
//  • email    : adresse simple, le lien mailto: est ajouté tout seul. "" → masqué.
// ─────────────────────────────────────────────────────────────────────────────
const TEAM = [
  {
    name: 'Jacques Mougeot',
    role: { en: 'Co-founder', fr: 'Cofondateur' },
    note: {
      en: 'Centrale engineer with a background in computer science research. He turns hands-on sales intuition into product: Ruby pinpoints your focus area and coaches you, automatically.',
      fr: 'Ingénieur Centrale, issu de la recherche en informatique. Il transforme l’intuition terrain en produit : Ruby identifie ton point de focus et t’accompagne, automatiquement.',
    },
    photo: '/team/jacques.webp',
    linkedin: 'https://www.linkedin.com/in/jacquesmougeot/',
    email: 'jacques.mougeot@centrale-med.fr',
  },
  {
    name: 'Lumine Trentelivres',
    role: { en: 'Co-founder', fr: 'Cofondatrice' },
    note: {
      en: 'Centrale engineer, former sales rep. She lived the real problem firsthand: knowing her areas to improve but never finding the time to make them stick. That’s where Ruby came from.',
      fr: 'Ingénieure Centrale, ex-sales. Elle a vécu le vrai problème : connaître ses axes de progression sans jamais trouver le temps de les ancrer. C’est de là qu’est né Ruby.',
    },
    photo: '/team/lumine.webp',
    linkedin: 'https://www.linkedin.com/in/lumine-trentelivres/',
    email: 'lumine.builds@gmail.com',
  },
]

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

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

/**
 * Team — qui construit Ruby. Même langage que les Intégrations (fond sombre,
 * révélations framer-motion), pour rester dans l'arc obscurité → lumière avant
 * le CTA final. Ancrée #team (lien du header).
 */
export default function Team() {
  const { t, locale } = useI18n()
  const reduce = useReducedMotion()
  const reveal = {
    hidden: { opacity: 0, y: reduce ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
  }

  return (
    <section id="team" className="relative overflow-hidden bg-[#0b0b0d] text-ink">
      <div className="thread-soft pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 opacity-40" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-32 text-center md:py-40">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-15%' }}
        >
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{t('team.kicker')}</span>
          <h2 className="mx-auto mt-5 max-w-2xl text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-medium leading-[1.1] tracking-tight">
            {t('team.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            {t('team.subtitle')}
          </p>
        </motion.div>

        <motion.ul
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2"
        >
          {TEAM.map((m) => (
            <li
              key={m.name}
              className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-sm transition-colors hover:border-white/20"
            >
              {m.photo ? (
                <img
                  src={m.photo}
                  alt={m.name}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-ruby/40"
                  style={{ boxShadow: '0 0 28px -8px var(--ruby-glow)' }}
                />
              ) : (
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-semibold text-ink ring-2 ring-ruby/40"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%), radial-gradient(circle at 50% 60%, #c41230, #6e0a1c)',
                    boxShadow: '0 0 28px -8px var(--ruby-glow)',
                  }}
                >
                  {initials(m.name)}
                </span>
              )}

              <h3 className="mt-5 text-lg font-medium tracking-tight">{m.name}</h3>
              <p className="mt-1 text-sm font-medium text-ruby">{loc(m.role, locale)}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{loc(m.note, locale)}</p>

              <div className="mt-5 flex items-center gap-2">
                {m.linkedin && (
                  <a
                    href={m.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t('team.linkedinAria').replace('{name}', m.name)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition-colors hover:border-white/25 hover:text-ink"
                  >
                    <LinkedInIcon />
                  </a>
                )}
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    aria-label={t('team.emailAria').replace('{name}', m.name)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-muted transition-colors hover:border-white/25 hover:text-ink"
                  >
                    <MailIcon />
                  </a>
                )}
              </div>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
