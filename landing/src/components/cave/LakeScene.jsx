import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U_END, LAKE_Y, smooth01 } from './config'
import { makeNormalTex } from './textures'

/** Chaîne de montagnes : un anneau dont le bord supérieur est une crête
 *  déchiquetée (fbm sur l'angle) → silhouette de montagnes tout autour de
 *  l'horizon, dégradé sombre→brume vers les sommets. On en empile plusieurs
 *  (rayons/hauteurs/teintes différents) pour la profondeur atmosphérique. */
function MountainRing({ center, noise, radius, peak, baseY, color, seed = 0, ridge = 1.4 }) {
  const geometry = useMemo(() => {
    const N = 240
    const H = 320
    const g = new THREE.CylinderGeometry(radius, radius, H, N, 1, true)
    g.translate(0, H / 2, 0) // base à y=0 (placée sous le lac via baseY)
    const pos = g.attributes.position
    const v = new THREE.Vector3()
    const base = new THREE.Color(color)
    const haze = new THREE.Color('#b7cfe0') // brume claire captée par les sommets
    const colors = new Array(pos.count * 3)
    const top = H - 1
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      if (v.y > top) {
        // crête : fbm circulaire (continu → pas de couture) selon l'angle
        const ang = Math.atan2(v.z, v.x)
        const cx = Math.cos(ang) * ridge + seed
        const cz = Math.sin(ang) * ridge - seed
        let h = 0
        let amp = 1
        let f = 1
        for (let o = 0; o < 5; o++) {
          h += amp * (noise(cx * f, cz * f, seed * 1.7) * 0.5 + 0.5)
          amp *= 0.5
          f *= 2.0
        }
        v.y = peak * (0.18 + h * 0.95) // hauteur de pic variable
        pos.setXYZ(i, v.x, v.y, v.z)
      }
    }
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const t = THREE.MathUtils.clamp(v.y / (peak * 1.1), 0, 1)
      const c = base.clone().lerp(haze, t * t * 0.85) // sommets plus clairs/brumeux
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [noise, radius, peak, color, seed, ridge])

  return (
    <mesh geometry={geometry} position={[center.x, baseY, center.z]}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} side={THREE.BackSide} />
    </mesh>
  )
}

/** Le lac : grande nappe d'eau calme à la surface (orientée vers le haut → on la
 *  perce en montant), soleil bas, montagnes, et la lumière du jour qui plonge dans
 *  la cheminée. Tout s'allume avec la sortie (exitRef) ; sinon le fog le masque. */
export function LakeScene({ curve, noise, exitRef }) {
  const END = useMemo(() => curve.getPointAt(U_END), [curve])
  const horizDir = useMemo(() => {
    const t = curve.getTangentAt(U_END).clone()
    t.y = 0
    return t.normalize()
  }, [curve])
  // soleil placé BIEN au-delà du dernier anneau de montagnes (rayon 560) → il est
  // derrière elles. Hauteur basse : il se pose sur la ligne de crête, partiellement
  // occulté par les pics (le Bloom ne fait briller que la partie visible).
  const sunPos = useMemo(
    () => new THREE.Vector3(END.x, LAKE_Y + 118, END.z).addScaledVector(horizDir, 1000),
    [END, horizDir],
  )
  const sky = useRef()
  const sun = useRef()
  const shaft = useRef()

  const geom = useMemo(() => new THREE.PlaneGeometry(1400, 1400, 1, 1), [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const normalA = useMemo(() => {
    const t = makeNormalTex(256, 4, 1.0, 1.3)
    t.repeat.set(70, 70)
    return t
  }, [])
  const normalB = useMemo(() => {
    const t = makeNormalTex(256, 4, 1.6, 1.0)
    t.repeat.set(130, 130)
    return t
  }, [])
  const onBeforeCompile = useCallback(
    (shader) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3( position );
transformed.z += sin(position.x*0.04 + uTime*0.4)*0.5 + sin(position.y*0.05 - uTime*0.3)*0.4;`,
        )
    },
    [uniforms],
  )

  useFrame((_, delta) => {
    const s = smooth01((exitRef.current - 0.2) / 0.8)
    if (sky.current) sky.current.intensity = 1.1 * s
    if (sun.current) sun.current.intensity = 2.6 * s
    if (shaft.current) shaft.current.intensity = 650 * s
    uniforms.uTime.value += delta
    normalA.offset.x += delta * 0.006
    normalA.offset.y += delta * 0.004
    normalB.offset.x -= delta * 0.005
    normalB.offset.y += delta * 0.0065
  })

  return (
    <group>
      {/* surface du lac : plan orienté vers le haut → invisible vu de dessous (on
          perce la surface en remontant), nappe d'eau visible une fois émergé */}
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[END.x, LAKE_Y, END.z]}>
        <meshPhysicalMaterial
          color="#2c4a60"
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.7}
          normalMap={normalA}
          normalScale={[0.25, 0.25]}
          clearcoatNormalMap={normalB}
          clearcoatNormalScale={[0.22, 0.22]}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      {/* Disque solide du soleil. Pas de halo géométrique additif (il flottait
          devant les montagnes car il ignore la profondeur) : la lueur est produite
          par le Bloom du post-traitement, qui n'illumine QUE la partie réellement
          visible → le bas caché par une crête ne brille pas. Le disque, lui, écrit
          la profondeur → les montagnes l'occultent correctement. */}
      <mesh position={sunPos.toArray()}>
        <sphereGeometry args={[78, 32, 32]} />
        <meshBasicMaterial color="#ffe7c6" toneMapped={false} />
      </mesh>
      {/* 3 chaînes empilées : lointaine et claire (brume) → proche et sombre */}
      <MountainRing center={END} noise={noise} radius={560} peak={150} baseY={LAKE_Y - 34} color="#5b6f86" seed={3.1} ridge={1.0} />
      <MountainRing center={END} noise={noise} radius={420} peak={120} baseY={LAKE_Y - 28} color="#3a4d63" seed={8.7} ridge={1.5} />
      <MountainRing center={END} noise={noise} radius={300} peak={78} baseY={LAKE_Y - 22} color="#243140" seed={14.2} ridge={2.2} />
      {/* lumière du jour plongeant dans la cheminée + ciel ambiant (montent avec la sortie) */}
      <pointLight ref={shaft} color="#cfe6ff" intensity={0} distance={160} decay={1.3} position={[END.x, LAKE_Y - 6, END.z]} />
      <hemisphereLight ref={sky} args={['#dce8ff', '#26323c', 0]} />
      <directionalLight ref={sun} color="#ffdcae" intensity={0} position={sunPos.toArray()} />
    </group>
  )
}
