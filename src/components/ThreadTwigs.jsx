import { useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * TOILE de fond — une grande toile de fils très fins qui DESCENDENT (diagonales
 * vers le bas qui se croisent). N'apparaît qu'À PARTIR de la section Équipe
 * (team + CTA). Discrète : traits 0.5px à faible opacité, petits nœuds épars,
 * et des éclats de courant ADOUCIS (fil-flow, moins intenses que ceux du fil
 * central) qui parcourent des chemins descendants.
 *
 * COORDONNÉES ABSOLUES (px) : la toile est générée procéduralement à partir de
 * la largeur RÉELLE du conteneur — la maille garde la même échelle sur tous les
 * écrans (pas d'étirement viewBox qui écrase le motif sur mobile), et les
 * colonnes DÉBORDENT des deux côtés (±MARGIN) : les fils viennent de hors-écran
 * et y repartent, coupés au bord par l'overflow-hidden de la section.
 * `phase` décale les éclats du cluster (les sections ne crépitent pas en chœur).
 */

const STEP = 210 // px entre deux colonnes de la maille
const MARGIN = 170 // px de débord au-delà des bords gauche/droit
const HEIGHT = 560 // bande de hauteur fixe (échelle verticale constante)

// trois rangées : hauteur de base + amplitude de jitter + décalage horizontal
// (les rangées ne sont pas alignées → les diagonales se croisent)
const ROWS = [
  { y: 65, jy: 35, off: 0 },
  { y: 270, jy: 40, off: 0.45 },
  { y: 500, jy: 45, off: -0.15 },
]

// pseudo-aléatoire DÉTERMINISTE (même toile à chaque rendu / resize)
const rand = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const pt = (r, i) => {
  const row = ROWS[r]
  const x = (i + row.off) * STEP + (rand(i * 3.7 + r * 17.3 + 1) - 0.5) * 120
  const y = row.y + (rand(i * 5.1 + r * 23.7 + 9) - 0.5) * 2 * row.jy
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

const seg = (pts) => pts.map(([x, y], n) => `${n ? 'L' : 'M'}${x} ${y}`).join(' ')

// la toile pour une largeur donnée : fils, nœuds, routes d'éclats
function makeWeb(width) {
  const i0 = Math.floor(-MARGIN / STEP) - 1
  const i1 = Math.ceil((width + MARGIN) / STEP) + 1
  const edges = []
  const nodes = []
  const flows = []
  for (let i = i0; i <= i1; i++) {
    // rangée du haut → milieu : chaque point du milieu reçoit deux diagonales
    // (venant de la gauche et de la droite) ; quelques fils manquent, comme
    // une toile réelle
    if (rand(i * 7.9 + 2) > 0.12) edges.push([pt(0, i), pt(1, i)])
    if (rand(i * 11.3 + 4) > 0.12) edges.push([pt(0, i + 1), pt(1, i)])
    // milieu → bas
    if (rand(i * 13.1 + 6) > 0.12) edges.push([pt(1, i), pt(2, i)])
    if (rand(i * 15.7 + 8) > 0.12) edges.push([pt(1, i), pt(2, i + 1)])
    // petits nœuds épars, seulement dans l'écran (hors-écran = DOM inutile)
    for (let r = 0; r < 3; r++) {
      const p = pt(r, i)
      if (p[0] >= 0 && p[0] <= width && rand(i * 19.3 + r * 7.7 + 3) < 0.35) {
        nodes.push({ p, delay: rand(i * 29.1 + r * 3.3 + 5) * 4 })
      }
    }
    // routes d'éclats — toujours du HAUT vers le BAS, en suivant des fils
    // existants : haut → milieu[i] → bas
    if (rand(i * 17.9 + 12) < 0.55) {
      const a = rand(i * 31.7 + 14) < 0.5 ? 0 : 1
      const b = rand(i * 37.3 + 16) < 0.5 ? 0 : 1
      flows.push({
        pts: [pt(0, i + a), pt(1, i), pt(2, i + b)],
        delay: rand(i * 41.9 + 18) * 6,
      })
    }
  }
  return { edges, nodes, flows }
}

export default function ThreadTwigs({ className = '', phase = 0 }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // NB : sur un <svg>, ResizeObserver suit la bbox du CONTENU (0 quand vide,
    // insensible au resize CSS) → on observe la section parente et on mesure
    // le svg via getBoundingClientRect
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width))
    ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [])

  const web = width > 0 ? makeWeb(width) : null

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${Math.max(width, 1)} ${HEIGHT}`}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-[560px] w-full overflow-visible ${className}`}
    >
      {web && (
        <>
          {web.edges.map((pts, n) => (
            <path key={`e-${n}`} className="fil-line" d={seg(pts)} />
          ))}
          {web.nodes.map(({ p, delay }, n) => (
            <path
              key={`n-${n}`}
              className="fil-node"
              d={`M${p[0]} ${p[1]} l0.01 0`}
              style={{ '--delay': `${delay.toFixed(2)}s` }}
            />
          ))}
          {!reduce &&
            web.flows.map(({ pts, delay }, n) => (
              <path
                key={`f-${n}`}
                className="fil-flow"
                d={seg(pts)}
                pathLength="100"
                style={{ '--delay': `${((delay + phase) % 6).toFixed(2)}s` }}
              />
            ))}
        </>
      )}
    </svg>
  )
}
