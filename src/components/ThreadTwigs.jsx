import { useReducedMotion } from 'framer-motion'

/**
 * TOILE de fond — une grande toile de fils très fins qui DESCENDENT (diagonales
 * vers le bas qui se croisent), étalée sur toute la largeur de la section.
 * N'apparaît qu'À PARTIR de la section Équipe (team + CTA). Discrète :
 * traits 0.5px à faible opacité, petits nœuds épars, et des éclats de courant
 * ADOUCIS (fil-flow, moins intenses que ceux du fil central) qui parcourent des
 * chemins à travers la toile.
 *
 * Bande de hauteur FIXE (560px, largeur étirée sur 100 %) → mailles et éclats
 * gardent la même échelle verticale partout. `phase` décale les éclats du
 * cluster (les sections ne crépitent pas en chœur).
 */

// les points de la toile (répartis sur 1200 × 560, trois rangées irrégulières)
const P = {
  a: [60, 70],
  b: [250, 35],
  c: [455, 100],
  d: [640, 45],
  e: [860, 85],
  f: [1090, 50],
  g: [150, 260],
  h: [360, 300],
  i: [585, 240],
  j: [800, 290],
  k: [1010, 235],
  l: [1160, 310],
  m: [80, 470],
  n: [300, 530],
  o: [520, 455],
  p: [740, 520],
  q: [950, 470],
  r: [1130, 540],
}

// les fils de la toile : TOUS orientés vers le bas (diagonales descendantes qui
// se croisent — des fils qui « tombent », jamais d'horizontale ni de remontée)
const EDGES = [
  ['a', 'g'], ['b', 'g'], ['b', 'h'], ['c', 'h'], ['c', 'i'],
  ['d', 'i'], ['d', 'j'], ['e', 'j'], ['e', 'k'], ['f', 'k'], ['f', 'l'],
  ['g', 'm'], ['g', 'n'], ['h', 'm'], ['h', 'n'], ['i', 'n'],
  ['i', 'o'], ['j', 'o'], ['j', 'p'], ['k', 'p'], ['k', 'q'], ['l', 'q'], ['l', 'r'],
]

// petits nœuds épars (pas sur tous les points — juste quelques scintillements)
const NODES = ['b', 'd', 'g', 'i', 'k', 'n', 'p', 'q']

// routes parcourues par un éclat — toujours du HAUT vers le BAS
const FLOWS = [
  { ids: ['a', 'g', 'n'], delay: 0.5 },
  { ids: ['c', 'i', 'o'], delay: 2.2 },
  { ids: ['e', 'j', 'p'], delay: 3.9 },
  { ids: ['f', 'k', 'q'], delay: 5.1 },
  { ids: ['b', 'h', 'm'], delay: 1.4 },
]

const seg = (ids) => ids.map((id, n) => `${n ? 'L' : 'M'}${P[id][0]} ${P[id][1]}`).join(' ')

export default function ThreadTwigs({ className = '', phase = 0 }) {
  const reduce = useReducedMotion()
  return (
    <svg
      viewBox="0 0 1200 560"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-[560px] w-full overflow-visible ${className}`}
    >
      {EDGES.map(([x, y]) => (
        <path key={`${x}${y}`} className="fil-line" d={seg([x, y])} />
      ))}
      {NODES.map((id, i) => (
        <path
          key={`n-${id}`}
          className="fil-node"
          d={`M${P[id][0]} ${P[id][1]} l0.01 0`}
          style={{ '--delay': `${(i * 1.1) % 4}s` }}
        />
      ))}
      {!reduce &&
        FLOWS.map(({ ids, delay }) => (
          <path
            key={`f-${ids.join('')}`}
            className="fil-flow"
            d={seg(ids)}
            pathLength="100"
            style={{ '--delay': `${(delay + phase) % 6}s` }}
          />
        ))}
    </svg>
  )
}
