import { useMemo } from 'react'
import * as THREE from 'three'
import { U_END, LAKE_Y } from './config'
import { rockFbm, rockColor } from './rock'

/** Cheminée rocheuse : remonte du trou du plafond (au bout de la grotte) jusqu'à
 *  la surface, ouverte sur le ciel. Toujours présente → amorce visible + aucun pop.
 *  Même roche que le tunnel (rockFbm/rockColor partagés). */
export function ExitShaft({ curve, noise, rockNormal, rockRough }) {
  const END = useMemo(() => curve.getPointAt(U_END), [curve])
  const geometry = useMemo(() => {
    const botY = 18 // recouvre le plafond (~26) par le bas → scelle le pourtour du trou
    const g = new THREE.CylinderGeometry(30, 21, LAKE_Y - botY, 48, 40, true)
    g.translate(0, (botY + LAKE_Y) / 2, 0)
    const pos = g.attributes.position
    const v = new THREE.Vector3()
    const colors = []
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const r = Math.hypot(v.x, v.z) || 1
      const d = rockFbm(noise, v.x, v.y, v.z, 40) // offset 40 → motif distinct du tunnel
      v.x += (v.x / r) * d * 7.6
      v.z += (v.z / r) * d * 7.6
      pos.setXYZ(i, v.x, v.y, v.z)
      const c = rockColor(noise, d, v.x, v.y, v.z)
      colors.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [curve, noise])

  // mêmes textures que la grotte (clonées juste pour le repeat propre à la cheminée)
  const normal = useMemo(() => {
    const t = rockNormal.clone()
    t.repeat.set(8, 12)
    t.needsUpdate = true
    return t
  }, [rockNormal])
  const rough = useMemo(() => {
    const t = rockRough.clone()
    t.repeat.set(6, 10)
    t.needsUpdate = true
    return t
  }, [rockRough])

  return (
    <mesh geometry={geometry} position={[END.x, 0, END.z]}>
      <meshStandardMaterial
        vertexColors
        normalMap={normal}
        normalScale={[1.7, 1.7]}
        roughnessMap={rough}
        roughness={1}
        metalness={0.05}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
