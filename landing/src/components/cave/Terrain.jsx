import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { TUBE_R, WATER_Y, U_SCREENS, U_END, HOLE_HALF_U, HOLE_UP, frameAt } from './config'
import { makeNormalTex } from './textures'

/** Parois rocheuses : grandes formes + grain fin (normal map) + AO dans les
 *  creux + rugosité variée + bas mouillé. */
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
    const rock = new THREE.Color('#1c1822')
    const warm = new THREE.Color('#322733')
    const wet = new THREE.Color('#090910')
    const mineral = new THREE.Color('#24303a') // veines minérales froides
    const ceil = new Array(pos.count) // sommets du plafond, au bout → trou de sortie
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      n.fromBufferAttribute(nor, i)
      // déplacement multi-échelle : grandes bosses → détails fins
      let d = 0
      let amp = 1
      let freq = 0.022
      for (let o = 0; o < 7; o++) {
        d += amp * noise(v.x * freq, v.y * freq, v.z * freq)
        amp *= 0.5
        freq *= 2.15
      }
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
      let c = rock.clone().lerp(warm, THREE.MathUtils.clamp(d * 0.5 + 0.5, 0, 1))
      // veines minérales : grandes plaques de teinte (bruit basse fréquence)
      const mv = noise(v.x * 0.012, v.y * 0.012, v.z * 0.012)
      c.lerp(mineral, THREE.MathUtils.clamp(mv * 0.5 + 0.5, 0, 1) * 0.28)
      // occlusion ambiante : les creux (d < 0) s'assombrissent → profondeur
      const ao = THREE.MathUtils.clamp(0.72 + d * 0.5, 0.4, 1)
      c.multiplyScalar(ao)
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

/** Cristaux + grands blocs rocheux (texturés), au-dessus de l'eau. */
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

/** Nappe d'eau : houle douce (géométrie) + 2 couches de rides (normal maps) +
 *  sheen fresnel sur l'ENVIRONNEMENT seulement. Ne réfléchit pas la scène,
 *  donc aucun reflet du rubis. */
export function Water() {
  const geom = useMemo(() => new THREE.PlaneGeometry(440, 440, 110, 110), [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const normalA = useMemo(() => {
    const t = makeNormalTex(256, 4, 1.1, 1.5)
    t.repeat.set(8, 8)
    return t
  }, [])
  const normalB = useMemo(() => {
    const t = makeNormalTex(256, 4, 1.7, 1.2)
    t.repeat.set(15, 15)
    return t
  }, [])

  // vagues calculées dans le vertex shader → 0 coût CPU, rendu identique
  const onBeforeCompile = useCallback(
    (shader) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uTime;
float wHeight(vec2 p){
  return sin(p.x*0.09 + uTime*0.45)*0.3
       + sin(p.y*0.12 - uTime*0.32)*0.22
       + sin((p.x+p.y)*0.07 + uTime*0.5)*0.15;
}`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `float dzdx = cos(position.x*0.09 + uTime*0.45)*0.027 + cos((position.x+position.y)*0.07 + uTime*0.5)*0.0105;
float dzdy = cos(position.y*0.12 - uTime*0.32)*0.0264 + cos((position.x+position.y)*0.07 + uTime*0.5)*0.0105;
vec3 objectNormal = normalize(vec3(-dzdx, -dzdy, 1.0));
#ifdef USE_TANGENT
  vec3 objectTangent = vec3( tangent.xyz );
#endif`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3( position );
transformed.z += wHeight(position.xy);`,
        )
    },
    [uniforms],
  )

  useFrame((_, delta) => {
    uniforms.uTime.value += delta
    normalA.offset.x += delta * 0.014
    normalA.offset.y += delta * 0.009
    normalB.offset.x -= delta * 0.011
    normalB.offset.y += delta * 0.015
  })

  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]}>
      <meshPhysicalMaterial
        color="#08171f"
        roughness={0.16}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.14}
        envMapIntensity={1.35}
        normalMap={normalA}
        normalScale={[0.32, 0.32]}
        clearcoatNormalMap={normalB}
        clearcoatNormalScale={[0.28, 0.28]}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
