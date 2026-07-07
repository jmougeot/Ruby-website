import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'

const ease = [0.22, 1, 0.36, 1]

/* Logos de marque MONOCHROMES (source : Simple Icons) — teintés via `currentColor`,
   donc pilotés par la charte (muted au repos → rouge Ruby quand le courant part). */
function ZoomLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.033 14.649H.743a.74.74 0 0 1-.686-.458.74.74 0 0 1 .16-.808L3.19 10.41H1.06A1.06 1.06 0 0 1 0 9.35h3.957c.301 0 .57.18.686.458a.74.74 0 0 1-.161.808L1.51 13.59h2.464c.585 0 1.06.475 1.06 1.06zM24 11.338c0-1.14-.927-2.066-2.066-2.066-.61 0-1.158.265-1.537.686a2.061 2.061 0 0 0-1.536-.686c-1.14 0-2.066.926-2.066 2.066v3.311a1.06 1.06 0 0 0 1.06-1.06v-2.251a1.004 1.004 0 0 1 2.013 0v2.251c0 .586.474 1.06 1.06 1.06v-3.311a1.004 1.004 0 0 1 2.012 0v2.251c0 .586.475 1.06 1.06 1.06zM16.265 12a2.728 2.728 0 1 1-5.457 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0zm-4.82 0a2.728 2.728 0 1 1-5.458 0 2.728 2.728 0 0 1 5.457 0zm-1.06 0a1.669 1.669 0 1 0-3.338 0 1.669 1.669 0 0 0 3.338 0z" />
    </svg>
  )
}
function MeetLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.53 2.13 0 7.75h5.53zm.398 0v5.62h7.608v3.65l5.47-4.45c-.014-1.22.031-2.25-.025-3.46-.148-1.09-1.287-1.47-2.236-1.36zM23.1 4.32c-.802.295-1.358.995-2.047 1.49-2.506 2.05-4.982 4.12-7.468 6.19 3.025 2.59 6.04 5.18 9.065 7.76 1.218.671 1.428-.814 1.328-1.64v-13a.828.828 0 0 0-.877-.825zM.038 8.15v7.7h5.53v-7.7zm13.577 8.1H6.008v5.62c3.864-.006 7.737.011 11.58-.009 1.02-.07 1.618-1.12 1.468-2.07v-2.51l-5.47-4.68v3.65zm-13.577 0c.02 1.44-.041 2.88.033 4.31.162.948 1.158 1.43 2.047 1.31h3.464v-5.62z" />
    </svg>
  )
}
function TeamsLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.625 8.127q-.55 0-1.025-.205-.475-.205-.832-.563-.358-.357-.563-.832Q18 6.053 18 5.502q0-.54.205-1.02t.563-.837q.357-.358.832-.563.474-.205 1.025-.205.54 0 1.02.205t.837.563q.358.357.563.837.205.48.205 1.02 0 .55-.205 1.025-.205.475-.563.832-.357.358-.837.563-.48.205-1.02.205zm0-3.75q-.469 0-.797.328-.328.328-.328.797 0 .469.328.797.328.328.797.328.469 0 .797-.328.328-.328.328-.797 0-.469-.328-.797-.328-.328-.797-.328zM24 10.002v5.578q0 .774-.293 1.46-.293.685-.803 1.194-.51.51-1.195.803-.686.293-1.459.293-.445 0-.908-.105-.463-.106-.85-.329-.293.95-.855 1.729-.563.78-1.319 1.336-.756.557-1.67.861-.914.305-1.898.305-1.148 0-2.162-.398-1.014-.399-1.805-1.102-.79-.703-1.312-1.664t-.674-2.086h-5.8q-.411 0-.704-.293T0 16.881V6.873q0-.41.293-.703t.703-.293h8.59q-.34-.715-.34-1.5 0-.727.275-1.365.276-.639.75-1.114.475-.474 1.114-.75.638-.275 1.365-.275t1.365.275q.639.276 1.114.75.474.475.75 1.114.275.638.275 1.365t-.275 1.365q-.276.639-.75 1.113-.475.475-1.114.75-.638.276-1.365.276-.188 0-.375-.024-.188-.023-.375-.058v1.078h10.875q.469 0 .797.328.328.328.328.797zM12.75 2.373q-.41 0-.78.158-.368.158-.638.434-.27.275-.428.639-.158.363-.158.773 0 .41.158.78.159.368.428.638.27.27.639.428.369.158.779.158.41 0 .773-.158.364-.159.64-.428.274-.27.433-.639.158-.369.158-.779 0-.41-.158-.773-.159-.364-.434-.64-.275-.275-.639-.433-.363-.158-.773-.158zM6.937 9.814h2.25V7.94H2.814v1.875h2.25v6h1.875zm10.313 7.313v-6.75H12v6.504q0 .41-.293.703t-.703.293H8.309q.152.809.556 1.5.405.691.985 1.19.58.497 1.318.779.738.281 1.582.281.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752zm5.25-1.547v-5.203h-3.75v6.855q.305.305.691.452.387.146.809.146.469 0 .879-.176.41-.175.715-.48.304-.305.48-.715t.176-.879Z" />
    </svg>
  )
}

/* Scène en unités du viewBox (1000 × 680), centre = l'orbe Ruby.
   Les outils sont DISSÉMINÉS (angles/rayons volontairement irréguliers, pas un
   cercle parfait) et reliés au cœur par un fil que remonte un courant de lumière.
   Gong / Modjo : pas de logo dispo (Simple Icons) → wordmark monochrome. */
const CENTER = { x: 500, y: 340 }
const TOOLS = [
  { name: 'Zoom', Logo: ZoomLogo, x: 178, y: 150 },
  { name: 'Google Meet', Logo: MeetLogo, x: 820, y: 128 },
  { name: 'Microsoft Teams', Logo: TeamsLogo, x: 882, y: 432 },
  { name: 'Gong', x: 150, y: 470 },
  { name: 'Modjo', x: 636, y: 588 },
]
const CYCLE = 2.6 // s — durée d'un courant, du logo jusqu'au cœur
const PULSE = 30 // longueur (unités viewBox) du segment lumineux

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

        {/* Constellation : orbe Ruby au centre, outils disséminés autour, reliés par
            un courant de lumière rouge qui file du logo vers le cœur. */}
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-10%' }}
          className="int-stage mx-auto mt-14 w-full max-w-2xl"
          style={{ aspectRatio: '1000 / 680' }}
        >
          {/* les fils + le courant (SVG au fond) */}
          <svg
            viewBox="0 0 1000 680"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            {TOOLS.map((tool) => (
              <line
                key={`base-${tool.name}`}
                className="int-wire-base"
                x1={tool.x}
                y1={tool.y}
                x2={CENTER.x}
                y2={CENTER.y}
              />
            ))}
            {!reduce &&
              TOOLS.map((tool, i) => {
                const len = Math.hypot(CENTER.x - tool.x, CENTER.y - tool.y)
                return (
                  <line
                    key={`flow-${tool.name}`}
                    className="int-wire-flow"
                    x1={tool.x}
                    y1={tool.y}
                    x2={CENTER.x}
                    y2={CENTER.y}
                    style={{
                      '--len': `${len}px`,
                      '--dur': `${CYCLE}s`,
                      '--delay': `${(i * CYCLE) / TOOLS.length}s`,
                      strokeDasharray: `${PULSE} ${len}`,
                    }}
                  />
                )
              })}
          </svg>

          {/* le cœur : l'orbe Ruby qui tourne + halo rouge qui respire */}
          <div className="int-core" style={{ left: '50%', top: '50%' }}>
            <div className="int-core-halo" />
            <div className="ruby-orb int-core-orb">
              <div className="ruby-orb-spin" />
            </div>
          </div>

          {/* les logos disséminés */}
          {TOOLS.map((tool, i) => {
            const style = {
              left: `${(tool.x / 1000) * 100}%`,
              top: `${(tool.y / 680) * 100}%`,
              '--dur': `${CYCLE}s`,
              '--delay': `${(i * CYCLE) / TOOLS.length}s`,
            }
            const { Logo } = tool
            return (
              <div key={tool.name} className="int-node" style={style}>
                <div className="int-node-circle">
                  {Logo ? (
                    <Logo className="int-node-logo" />
                  ) : (
                    <span className="int-node-word">{tool.name}</span>
                  )}
                </div>
                <span className="int-node-label">{tool.name}</span>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
