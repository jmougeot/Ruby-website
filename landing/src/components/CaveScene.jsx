import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment,
  Lightformer,
  Trail,
  Instances,
  Instance,
  MeshTransmissionMaterial,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { createNoise3D, createNoise4D } from 'simplex-noise'
import * as THREE from 'three'

const TUBE_R = 26 // caverne vaste (≈ ×3)
const WATER_Y = -13 // niveau de l'eau (sous l'axe du tunnel)
const SPEED = 1 / 110 // un tour de tunnel en ~110 s (partagé caméra / lumière du bout)

/** Courbe fermée, PLANE (y≈0) : une nappe d'eau forme un sol constant. */
function useTunnelCurve() {
  return useMemo(() => {
    const pts = []
    const N = 14
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const radius = 90 + Math.sin(a * 3) * 24
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)
  }, [])
}

function frameAt(curve, u) {
  const tangent = curve.getTangentAt(u).normalize()
  const ref = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const normal = new THREE.Vector3().crossVectors(tangent, ref).normalize()
  const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize()
  return { tangent, normal, binormal }
}

/** Normal map procédurale et tileable (bruit 4D → pas de couture). */
function makeNormalTex(size, octaves, baseFreq, strength) {
  const noise4 = createNoise4D()
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const w = (y / size) * Math.PI * 2
      let n = 0
      let amp = 1
      let f = baseFreq
      for (let o = 0; o < octaves; o++) {
        n += amp * noise4(Math.cos(u) * f, Math.sin(u) * f, Math.cos(w) * f, Math.sin(w) * f)
        amp *= 0.5
        f *= 2.1
      }
      h[y * size + x] = n
    }
  }
  const data = new Uint8Array(size * size * 4)
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength
      const ny = (at(x, y - 1) - at(x, y + 1)) * strength
      const len = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = ((nx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  // lissage : sinon les DataTexture sont en Nearest → texels visibles (« pixels »)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/** Normal map de ROCHE : bruit "ridged" (crêtes/fissures nettes) + fbm,
 *  plus réaliste qu'un simple bruit lisse. */
function makeRockNormalTex(size = 768) {
  const n4 = createNoise4D()
  const h = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const w = (y / size) * Math.PI * 2
      const sx = Math.cos(u)
      const sy = Math.sin(u)
      const sz = Math.cos(w)
      const sw = Math.sin(w)
      let fbm = 0
      let amp = 1
      let f = 1.1
      for (let o = 0; o < 8; o++) {
        fbm += amp * n4(sx * f, sy * f, sz * f, sw * f)
        amp *= 0.5
        f *= 2.1
      }
      // composante ridged : sommets aigus → fissures/strates fines
      let ridge = 0
      let amp2 = 0.8
      let f2 = 2.0
      for (let o = 0; o < 6; o++) {
        const r = 1 - Math.abs(n4(sx * f2, sy * f2, sz * f2, sw * f2))
        ridge += amp2 * r * r
        amp2 *= 0.5
        f2 *= 2.2
      }
      h[y * size + x] = fbm * 0.65 + ridge * 1.0
    }
  }
  const data = new Uint8Array(size * size * 4)
  const S = 3.8
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * S
      const ny = (at(x, y - 1) - at(x, y + 1)) * S
      const len = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      data[i] = ((nx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.anisotropy = 8
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/** Map de rugosité : variation de brillance (zones humides/minérales vs mates). */
function makeRoughnessTex(size = 512) {
  const n4 = createNoise4D()
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2
      const w = (y / size) * Math.PI * 2
      let n = 0
      let amp = 1
      let f = 1.5
      for (let o = 0; o < 4; o++) {
        n += amp * n4(Math.cos(u) * f, Math.sin(u) * f, Math.cos(w) * f, Math.sin(w) * f)
        amp *= 0.5
        f *= 2.2
      }
      const g = THREE.MathUtils.clamp(0.78 + n * 0.22, 0.5, 0.98) * 255
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = g
      data[i + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/** Parois rocheuses : grandes formes + grain fin (normal map) + AO dans les
 *  creux + rugosité variée + bas mouillé. */
function TunnelWalls({ curve, noise, rockNormal, rockRough }) {
  const geometry = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, 760, TUBE_R, 32, true)
    const pos = g.attributes.position
    const nor = g.attributes.normal
    const v = new THREE.Vector3()
    const n = new THREE.Vector3()
    const colors = []
    const rock = new THREE.Color('#1c1822')
    const warm = new THREE.Color('#322733')
    const wet = new THREE.Color('#090910')
    const mineral = new THREE.Color('#24303a') // veines minérales froides
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
function WallFeatures({ curve, noise, rockNormal }) {
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
function Water() {
  const geom = useMemo(() => new THREE.PlaneGeometry(440, 440, 160, 160), [])
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

/** Lumière du FOND : projecteur placé devant qui VISE plus loin dans le tunnel.
 *  Son cône éclaire les parois lointaines, l'avant reste sombre → la lumière
 *  vient vraiment de la profondeur, qu'on n'atteint jamais (la courbe la cache). */
function EndLight({ curve }) {
  const spot = useRef()
  const target = useRef()
  const fill = useRef()
  useFrame(({ clock }) => {
    const base = clock.elapsedTime * SPEED
    const ps = curve.getPointAt((base + 0.14) % 1)
    ps.y = WATER_Y + 7
    const pt = curve.getPointAt((base + 0.34) % 1)
    pt.y = WATER_Y + 6
    if (spot.current) spot.current.position.copy(ps)
    if (target.current) {
      target.current.position.copy(pt)
      target.current.updateMatrixWorld()
      spot.current.target = target.current
    }
    // remplissage très faible, lui aussi loin devant (jamais à l'avant)
    const pf = curve.getPointAt((base + 0.22) % 1)
    pf.y = WATER_Y + 6
    if (fill.current) fill.current.position.copy(pf)
  })
  return (
    <group>
      <spotLight ref={spot} color="#8fc6df" intensity={950} distance={280} angle={0.95} penumbra={1} decay={1.15} />
      <object3D ref={target} />
      <pointLight ref={fill} color="#5f9fc0" intensity={55} distance={120} decay={1.5} />
    </group>
  )
}

/** Gemme multi-couches :
 *  - `outer` : coque facettée anguleuse (verre transmissif),
 *  - `inner` : icosaèdre subdivisé avec une teinte VARIÉE par facette
 *    (magenta/rouge/orange) → inclusions cristallines, texture, profondeur. */
function useGemLayers() {
  return useMemo(() => {
    const outer = new THREE.IcosahedronGeometry(2.2, 0)
    outer.scale(0.92, 1.14, 0.92) // silhouette de cristal taillé, un peu allongé

    const inner = new THREE.IcosahedronGeometry(1.5, 1) // detail 1 → 80 facettes
    inner.scale(0.92, 1.14, 0.92)
    // couleur par facette : palette rubis large et contrastée → texture marquée
    const palette = [
      new THREE.Color('#ff2a5a'),
      new THREE.Color('#c00834'),
      new THREE.Color('#ff6080'),
      new THREE.Color('#8e0626'),
      new THREE.Color('#ff7a48'),
      new THREE.Color('#e0104e'),
      new THREE.Color('#ff3d6e'),
    ]
    const pos = inner.attributes.position // non indexée → 1 triangle = 3 sommets
    const colors = []
    for (let i = 0; i < pos.count; i += 3) {
      const base = palette[(Math.random() * palette.length) | 0]
      const c = base.clone().offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.1)
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b)
    }
    inner.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return { outer, inner }
  }, [])
}

/** Le rubis (gemme taillée, verre réfractif ultra-réaliste) ; la caméra le suit. */
function RubyRig({ curve }) {
  const mesh = useRef()
  const inner = useRef()
  const gemLight = useRef()
  const { outer: outerGeo, inner: innerGeo } = useGemLayers()
  const camOffset = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useRef(new THREE.Vector3(0, WATER_Y + 6, 0))
  const bg = useMemo(() => new THREE.Color('#060a10'), [])
  const LEAD = 0.07

  // layer dédié : la lumière du rubis n'éclaire QUE le rubis (pas l'eau/les murs)
  useEffect(() => {
    mesh.current?.layers.enable(2)
    gemLight.current?.layers.set(2)
  }, [])

  useFrame(({ camera, clock, pointer }, delta) => {
    const e = clock.elapsedTime
    const t = (e * SPEED) % 1
    const camPos = curve.getPointAt(t)
    const camTangent = curve.getTangentAt(t)
    const rt = (t + LEAD) % 1
    const rubyPos = curve.getPointAt(rt)

    // balancement gauche/droite dans le repère du tunnel + léger flottement
    const { normal } = frameAt(curve, rt)
    rubyPos.addScaledVector(normal, Math.sin(e * 0.5) * 6)
    rubyPos.y = WATER_Y + 6 + Math.sin(e * 0.7) * 0.6 // plus bas, toujours au-dessus de l'eau

    if (mesh.current) {
      mesh.current.position.copy(rubyPos)
      mesh.current.rotation.y = e * 0.5
      mesh.current.rotation.x = Math.sin(e * 0.3) * 0.25
    }
    // les inclusions contre-tournent → scintillement interne, profondeur
    if (inner.current) {
      inner.current.rotation.y = -e * 0.35
      inner.current.rotation.z = e * 0.22
    }
    // petite lumière chaude au-dessus du rubis → étincelles sur les facettes
    if (gemLight.current) gemLight.current.position.set(rubyPos.x + 1.2, rubyPos.y + 1.8, rubyPos.z + 1.2)

    // caméra haute, reculée le long du tunnel + regard adouci
    camOffset.x += (pointer.x * 3 - camOffset.x) * Math.min(1, delta * 3)
    camOffset.y += (pointer.y * 2 - camOffset.y) * Math.min(1, delta * 3)
    camera.position.copy(camPos)
    camera.position.addScaledVector(camTangent, -3.5) // un peu plus proche du rubis
    camera.position.x += camOffset.x
    camera.position.y = WATER_Y + 12 + camOffset.y

    lookTarget.current.lerp(rubyPos, Math.min(1, delta * 1.6))
    camera.lookAt(lookTarget.current)
  })

  return (
    <group>
      {/* bref filet de lumière dans son sillage — comme s'il nous guidait */}
      <Trail width={1.05} length={4} decay={1.3} color={new THREE.Color('#ff5566')} attenuation={(w) => w * w}>
        <mesh ref={mesh} geometry={outerGeo}>
          <MeshTransmissionMaterial
            transmission={1}
            thickness={1.5}
            roughness={0.03}
            ior={1.77}
            chromaticAberration={0.04}
            anisotropicBlur={0.04}
            distortion={0}
            distortionScale={0}
            temporalDistortion={0}
            attenuationColor="#ff3a64"
            attenuationDistance={1.9}
            color="#b00f3c"
            emissive="#ff1f4c"
            emissiveIntensity={0.14}
            background={bg}
            samples={6}
            resolution={256}
            flatShading
          />
          {/* inclusions : facettes de teintes variées, contre-tournent → texture */}
          <mesh ref={inner} geometry={innerGeo}>
            <meshStandardMaterial
              vertexColors
              emissive="#ff2a52"
              emissiveIntensity={0.45}
              roughness={0.3}
              metalness={0.1}
              transparent
              opacity={0.5}
              flatShading
            />
          </mesh>
          {/* noyau ROUGE PROFOND au cœur de la gemme, vu à travers le verre */}
          <mesh scale={0.62}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color="#5e0014"
              emissive="#c40022"
              emissiveIntensity={1.4}
              roughness={0.4}
              metalness={0}
              flatShading
            />
          </mesh>
          {/* petite étincelle chaude au centre du noyau (vie) */}
          <mesh scale={0.2}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#ffd2b0" toneMapped={false} />
          </mesh>
          {/* halo rouge profond serré */}
          <mesh scale={0.95}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color="#d8203a" transparent opacity={0.22} toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </mesh>
      </Trail>
      {/* lumière dédiée (layer 2) : fait scintiller le rubis sans toucher la scène */}
      <pointLight ref={gemLight} color="#ffd2c2" intensity={9} distance={7} decay={2} />
    </group>
  )
}

export default function CaveScene({ active = true }) {
  const noise = useMemo(() => createNoise3D(), [])
  const curve = useTunnelCurve()
  const rockNormal = useMemo(() => {
    const t = makeRockNormalTex(768)
    t.repeat.set(34, 7)
    return t
  }, [])
  const rockRough = useMemo(() => {
    const t = makeRoughnessTex(512)
    t.anisotropy = 8
    t.repeat.set(18, 4)
    return t
  }, [])

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 0], fov: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.75]}
    >
      <color attach="background" args={['#060a10']} />
      <fog attach="fog" args={['#060a10', 12, 155]} />

      {/* grotte sombre : l'avant est presque noir, la lumière vient du fond */}
      <ambientLight color="#16252f" intensity={0.07} />
      <hemisphereLight args={['#132834', '#05060c', 0.13]} />

      <TunnelWalls curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <WallFeatures curve={curve} noise={noise} rockNormal={rockNormal} />
      <Water />
      <EndLight curve={curve} />
      <RubyRig curve={curve} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="circle" intensity={2} color="#5a9cc0" position={[3, 2, -2]} scale={2.5} />
        <Lightformer form="rect" intensity={1.2} color="#dfeaf0" position={[-3, -1, -3]} scale={3} />
        {/* barre froide au-dessus → glint réfléchi sur l'eau (doux) */}
        <Lightformer form="rect" intensity={1.1} color="#cfe6f0" position={[0, 6, -4]} scale={[14, 2, 1]} />
      </Environment>

      <EffectComposer multisampling={4}>
        <Bloom intensity={0.65} luminanceThreshold={0.5} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  )
}
