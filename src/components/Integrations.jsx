import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'

const ease = [0.22, 1, 0.36, 1]

/* Scène en unités du viewBox (1200 × 660). RÉSEAU HIÉRARCHIQUE : les intégrations
   (logos monochromes) sont regroupées par famille — les lignes d'une famille se
   rejoignent en une JONCTION INVISIBLE (que des lignes, pas de pastille), puis
   filent vers le cœur (l'orbe Ruby). Segments droits, un virage à la jonction.
   Un courant de lumière rouge remonte : logo → jonction → cœur.
   Logos : assets de l'app (public/logos), teintés en masque CSS. */
const CENTER = { x: 600, y: 330 }

// jonctions de groupe : INVISIBLES — juste le point où les lignes d'une famille
// se rejoignent avant de filer vers le cœur (pas de pastille, que des lignes).
// Posées en dehors des axes du centre → aucun tronc horizontal/vertical.
const GROUPS = {
  other: { x: 742, y: 208 },
  call: { x: 405, y: 268 },
  crm: { x: 768, y: 452 },
}

const TOOLS = [
  // Autre (agenda / prise de notes / séquences / messagerie) — éparpillés en haut,
  // à des hauteurs/rayons variés (pas de rangée alignée).
  { id: 'google', name: 'Google', group: 'other', logo: 'googlecalendar.svg', x: 430, y: 100 },
  { id: 'notion', name: 'Notion', group: 'other', logo: 'notion.svg', x: 585, y: 62 },
  { id: 'lemlist', name: 'lemlist', group: 'other', x: 820, y: 55 },
  { id: 'slack', name: 'Slack', group: 'other', logo: 'slack.svg', x: 960, y: 98 },
  // Appel (téléphonie / conversation) — flanc gauche, en éventail. Allo/Modjo =
  // logos « badge » (fond plein), impossibles en silhouette propre → wordmark.
  { id: 'aircall', name: 'Aircall', group: 'call', logo: 'aircall.svg', x: 150, y: 135 },
  { id: 'ringover', name: 'Ringover', group: 'call', logo: 'ringover.svg', x: 80, y: 355 },
  { id: 'allo', name: 'Allo', group: 'call', x: 170, y: 512 },
  { id: 'modjo', name: 'Modjo', group: 'call', x: 255, y: 600 },
  // CRM — flanc droit/bas, rayons variés. Pipedrive = badge plein → wordmark.
  { id: 'salesforce', name: 'Salesforce', group: 'crm', logo: 'salesforce.svg', x: 1080, y: 282 },
  { id: 'hubspot', name: 'HubSpot', group: 'crm', logo: 'hubspot.svg', x: 1105, y: 530 },
  { id: 'pipedrive', name: 'Pipedrive', group: 'crm', x: 960, y: 605 },
  { id: 'attio', name: 'Attio', group: 'crm', logo: 'attio.svg', x: 700, y: 618 },
]

const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]))
const posOf = (id) => (id === 'center' ? CENTER : GROUPS[id] || TOOL_BY_ID[id])

// arêtes : chaque outil → son groupe (feuille), chaque groupe → le cœur (tronc)
const LEAF_EDGES = TOOLS.map((t) => [t.id, t.group])
const TRUNK_EDGES = Object.keys(GROUPS).map((g) => [g, 'center'])

const CYCLE = 3 // s — durée d'un courant

// segment DROIT entre deux nœuds (le virage naît de l'enchaînement feuille→groupe→cœur)
function seg(aId, bId) {
  const a = posOf(aId)
  const b = posOf(bId)
  return `M${a.x} ${a.y}L${b.x} ${b.y}`
}

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

        {/* Réseau : logos → nœud de groupe → orbe Ruby, courants qui convergent. */}
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="int-stage mx-auto mt-14 w-full max-w-5xl"
          style={{ aspectRatio: '1200 / 660' }}
        >
          <svg
            viewBox="0 0 1200 660"
            className="absolute inset-0 h-full w-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            {/* traces au repos — que des lignes, la jonction est invisible */}
            {LEAF_EDGES.map(([a, b]) => (
              <path key={`lb-${a}`} className="int-wire-base" d={seg(a, b)} />
            ))}
            {TRUNK_EDGES.map(([a, b]) => (
              <path key={`tb-${a}`} className="int-wire-base" d={seg(a, b)} />
            ))}

            {/* COURANTS — feuilles : logo → jonction */}
            {!reduce &&
              LEAF_EDGES.map(([a, b], i) => (
                <path
                  key={`lf-${a}`}
                  className="int-wire-flow"
                  d={seg(a, b)}
                  pathLength="100"
                  style={{ '--dur': `${CYCLE}s`, '--delay': `${(i / TOOLS.length) * CYCLE}s` }}
                />
              ))}
            {/* COURANTS — troncs : jonction → cœur */}
            {!reduce &&
              TRUNK_EDGES.map(([a, b], i) => (
                <path
                  key={`tf-${a}`}
                  className="int-wire-flow"
                  d={seg(a, b)}
                  pathLength="100"
                  style={{ '--dur': `${CYCLE}s`, '--delay': `${(i / 3) * CYCLE + CYCLE / 2}s` }}
                />
              ))}
          </svg>

          {/* le cœur : l'orbe Ruby qui tourne + halo rouge qui respire */}
          <div className="int-core" style={{ left: '50%', top: '50%' }}>
            <div className="int-core-halo" />
            <div className="ruby-orb int-core-orb">
              <div className="ruby-orb-spin" />
            </div>
          </div>

          {/* les logos (pastilles claires → couleurs lisibles sur fond sombre) */}
          {TOOLS.map((tool, i) => (
            <div
              key={tool.id}
              className="int-node"
              style={{
                left: `${(tool.x / 1200) * 100}%`,
                top: `${(tool.y / 660) * 100}%`,
                '--dur': `${CYCLE}s`,
                '--delay': `${(i / TOOLS.length) * CYCLE}s`,
              }}
            >
              <div className="int-node-circle">
                {tool.logo ? (
                  // logo monochrome via masque → teinté (gris au repos, flash rouge à l'émission)
                  <span
                    className="int-node-logo"
                    style={{ '--logo': `url(/logos/${tool.logo})` }}
                    role="img"
                    aria-label={tool.name}
                  />
                ) : (
                  <span className="int-node-word">{tool.name}</span>
                )}
              </div>
              <span className="int-node-label">{tool.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
