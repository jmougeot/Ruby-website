import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { TUBE_R, WATER_Y, U_SCREENS, U_END, HOLE_HALF_U, HOLE_UP, frameAt } from './config'
import { rockFbm, rockColor } from './rock'

/** Parois rocheuses : grandes formes + grain fin (normal map) + AO dans les
 *  creux + rugosité variée + bas mouillé + trou de sortie au plafond du bout. */
export function TunnelWalls({ curve, noise, rockNormal, rockRough }) {
  const geometry = useMemo(() => {
    const TUBULAR = 760
    const RADIAL = 32
    const g = new THREE.TubeGeometry(curve, TUBULAR, TUBE_R, RADIAL, true)
    const pos = g.attributes.position
    const nor = g.attributes.normal
    const v = new THREE.Vector3()
    const n = new THREE.Vector3()
    const colors = []
    const wet = new THREE.Color('#090910')
    const ceil = new Array(pos.count) // sommets du plafond, au bout → trou de sortie
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      n.fromBufferAttribute(nor, i)
      const d = rockFbm(noise, v.x, v.y, v.z)
      v.addScaledVector(n, d * 7.6)
      // ÉLARGISSEMENT EN SALLE autour de l'écran : pousse les parois vers
      // l'extérieur en cloche autour de U_SCREENS → la grotte s'ouvre.
      const u = Math.floor(i / (RADIAL + 1)) / TUBULAR
      const du = Math.abs(u - U_SCREENS)
      if (du < 0.075) {
        const bump = 0.5 * (1 + Math.cos((du / 0.075) * Math.PI)) // 1 au centre → 0
        v.addScaledVector(n, bump * 34)
      }
      // au BOUT de la grotte : marque les sommets du plafond (normale ~ vers le
      // haut) sur une fenêtre courte → leurs faces seront retirées = vrai trou.
      ceil[i] = Math.abs(u - U_END) < HOLE_HALF_U && n.y > HOLE_UP
      pos.setXYZ(i, v.x, v.y, v.z)
      const c = rockColor(noise, d, v.x, v.y, v.z)
      // bas de paroi mouillé près de l'eau
      const wetness = THREE.MathUtils.clamp((WATER_Y + 6 - v.y) / 12, 0, 1)
      c.lerp(wet, wetness * 0.75)
      colors.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    // retire les faces du plafond marquées → ouverture réelle vers la cheminée
    const idx = g.index.array
    const keep = []
    for (let f = 0; f < idx.length; f += 3) {
      const a = idx[f]
      const b = idx[f + 1]
      const c = idx[f + 2]
      if ((ceil[a] ? 1 : 0) + (ceil[b] ? 1 : 0) + (ceil[c] ? 1 : 0) >= 2) continue
      keep.push(a, b, c)
    }
    g.setIndex(keep)
    g.computeVertexNormals()
    return g
  }, [curve, noise])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        normalMap={rockNormal}
        normalScale={[1.7, 1.7]}
        roughnessMap={rockRough}
        roughness={1}
        metalness={0.05}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

/** Géométrie de bloc rocheux : icosaèdre déformé par bruit (relief en silhouette). */
function useRockChunk(noise) {
  return useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2)
    const pos = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const dir = v.clone().normalize()
      let d = 0
      let amp = 1
      let f = 1.6
      for (let o = 0; o < 4; o++) {
        d += amp * noise(dir.x * f, dir.y * f, dir.z * f)
        amp *= 0.5
        f *= 2.1
      }
      v.addScaledVector(dir, d * 0.4)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [noise])
}

/** Grands blocs rocheux (texturés, instanciés), au-dessus de l'eau. */
export function WallFeatures({ curve, noise, rockNormal }) {
  const chunk = useRockChunk(noise)
  const rockNormalChunks = useMemo(() => {
    const t = rockNormal.clone()
    t.repeat.set(2, 2)
    t.needsUpdate = true
    return t
  }, [rockNormal])

  const rocks = useMemo(() => {
    const upperRadial = (u) => {
      const { normal, binormal } = frameAt(curve, u)
      let radial
      for (let k = 0; k < 8; k++) {
        const ang = Math.random() * Math.PI * 2
        radial = normal
          .clone()
          .multiplyScalar(Math.cos(ang))
          .add(binormal.clone().multiplyScalar(Math.sin(ang)))
        if (radial.y > -0.1) break
      }
      return radial
    }

    const out = []
    for (let i = 0; i < 22; i++) {
      const u = Math.random()
      const center = curve.getPointAt(u)
      const radial = upperRadial(u)
      out.push({
        pos: center.clone().addScaledVector(radial, TUBE_R * 0.78),
        rot: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
        scale: [3 + Math.random() * 5, 5 + Math.random() * 9, 3 + Math.random() * 5],
      })
    }
    return out
  }, [curve])

  // instancing : les 22 blocs deviennent 1 seul draw call (dans chaque passe)
  return (
    <Instances geometry={chunk} limit={rocks.length} range={rocks.length}>
      <meshStandardMaterial
        color="#171219"
        normalMap={rockNormalChunks}
        normalScale={[1.1, 1.1]}
        roughness={1}
        metalness={0}
      />
      {rocks.map((it, i) => (
        <Instance key={i} position={it.pos} rotation={it.rot} scale={it.scale} />
      ))}
    </Instances>
  )
}
