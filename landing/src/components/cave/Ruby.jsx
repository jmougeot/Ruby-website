import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { WATER_Y, U_END, LAKE_Y, LEAD, U_SCREENS, smooth01, screenTransform } from './config'
import { makeGlowTex, makeRingTex } from './textures'

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
      new THREE.Color('#ff3a66'),
      new THREE.Color('#d40e3e'),
      new THREE.Color('#ff6f90'),
      new THREE.Color('#a00a30'),
      new THREE.Color('#ff5278'),
      new THREE.Color('#e21050'),
      new THREE.Color('#ff2f60'),
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

/** Le rubis (gemme taillée) ; il avance le long de la courbe selon le SCROLL.
 *  Immobile en translation si on ne défile pas, juste une rotation douce. */
export function RubyRig({ curve, uRef, exitRef }) {
  const mesh = useRef()
  const inner = useRef()
  const gemLight = useRef()
  const glowSprite = useRef()
  const hideRef = useRef(0)
  const { outer: outerGeo, inner: innerGeo } = useGemLayers()
  const coreGlowTex = useMemo(() => makeGlowTex(), [])
  const ringTex = useMemo(() => makeRingTex(), [])
  const camOffset = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useRef(new THREE.Vector3(0, WATER_Y + 6, 0))
  const bg = useMemo(() => new THREE.Color('#060a10'), [])
  const SCREEN = useMemo(() => screenTransform(curve), [curve])
  // repères de la sortie (ancrés sur le bout de la grotte) : on monte tout droit
  // au-dessus de END, regard d'abord vers la lumière du haut puis vers l'horizon.
  const END = useMemo(() => curve.getPointAt(U_END), [curve])
  const horizDir = useMemo(() => {
    const t = curve.getTangentAt(U_END).clone()
    t.y = 0
    return t.normalize()
  }, [curve])
  // un peu en avant en plus de "vers le haut" → évite le lookAt dégénéré (regard
  // exactement vertical ∥ à up) qui ferait basculer la caméra.
  const upLook = useMemo(
    () => new THREE.Vector3(END.x, LAKE_Y + 30, END.z).addScaledVector(horizDir, 40),
    [END, horizDir],
  )
  // regard final nettement RELEVÉ vers le ciel au-dessus du lac (pas plongeant)
  const horizonLook = useMemo(
    () => new THREE.Vector3(END.x, LAKE_Y + 34, END.z).addScaledVector(horizDir, 180),
    [END, horizDir],
  )
  const tmp = useMemo(
    () => ({
      follow: new THREE.Vector3(),
      fill: new THREE.Vector3(),
      look: new THREE.Vector3(),
      exitPos: new THREE.Vector3(),
      exitLook: new THREE.Vector3(),
      rubyExit: new THREE.Vector3(),
    }),
    [],
  )

  // layer dédié : la lumière du rubis n'éclaire QUE le rubis (pas l'eau/les murs)
  useEffect(() => {
    mesh.current?.layers.enable(2)
    gemLight.current?.layers.set(2)
  }, [])

  useFrame(({ camera, clock, pointer }, delta) => {
    const e = clock.elapsedTime
    const t = THREE.MathUtils.clamp(uRef.current, 0, 1)
    const camPos = curve.getPointAt(t)
    const camTangent = curve.getTangentAt(t)
    const rt = THREE.MathUtils.clamp(t + LEAD, 0, 1)
    const rubyPos = curve.getPointAt(rt)

    // pas de course latérale : le rubis reste posé devant, juste un léger flottement
    rubyPos.y = WATER_Y + 6 + Math.sin(e * 0.7) * 0.5

    // SORTIE : le rubis nous guide hors de la grotte, monte par le trou et va se
    // poser à la surface du lac, un peu en avant → l'œil suit jusqu'à l'horizon.
    const ex = smooth01(exitRef.current)
    if (ex > 0.0001) {
      tmp.rubyExit.set(END.x, LAKE_Y + 1.3 + Math.sin(e * 0.7) * 0.4, END.z).addScaledVector(horizDir, 18)
      rubyPos.lerp(tmp.rubyExit, ex)
    }

    // INTRO : au tout début, le rubis descend DU HAUT et se centre pile quand le
    // texte du hero s'efface. Décalage appliqué AU VISUEL seulement (la caméra
    // vise le point d'atterrissage → on voit le rubis descendre dans le cadre).
    const introY = smooth01(THREE.MathUtils.clamp(1 - uRef.current / 0.1, 0, 1)) * 24

    if (mesh.current) {
      mesh.current.position.copy(rubyPos)
      mesh.current.position.y += introY
      mesh.current.rotation.y = e * 0.25 // rotation lente sur lui-même (vivant)
      mesh.current.rotation.x = Math.sin(e * 0.3) * 0.18
    }
    // les inclusions contre-tournent → scintillement interne, profondeur
    if (inner.current) {
      inner.current.rotation.y = -e * 0.35
      inner.current.rotation.z = e * 0.22
    }
    // le cœur de lumière respire légèrement (vivant)
    if (glowSprite.current) glowSprite.current.scale.setScalar(6 * (1 + Math.sin(e * 1.6) * 0.06))
    // petite lumière chaude au-dessus du rubis → étincelles sur les facettes
    if (gemLight.current) gemLight.current.position.set(rubyPos.x + 1.2, rubyPos.y + introY + 1.8, rubyPos.z + 1.2)

    // approche : la grotte s'ouvre tôt (la caméra recule un peu)
    const wide = THREE.MathUtils.clamp((rt - 0.04) / 0.08, 0, 1)
    // climax : la caméra plonge face à l'écran à l'ARRIVÉE (tunnel court)
    const focus = THREE.MathUtils.clamp((uRef.current - 0.09) / 0.045, 0, 1)
    // bris : étalé (se brise lentement) → la caméra repart en suivi, on continue
    const brk = THREE.MathUtils.clamp((rt - U_SCREENS) / 0.18, 0, 1)
    const eFocus = focus * (1 - brk)

    // cacher le rubis tant que l'écran est plein et intact (sinon il transperce),
    // le faire réapparaître au bris (il brise l'écran et reprend la tête)
    hideRef.current += (eFocus - hideRef.current) * Math.min(1, delta * 6)
    if (mesh.current) mesh.current.scale.setScalar(Math.max(0.001, 1 - hideRef.current))

    camOffset.x += (pointer.x * 1.0 - camOffset.x) * Math.min(1, delta * 2) // parallaxe douce
    camOffset.y += (pointer.y * 0.6 - camOffset.y) * Math.min(1, delta * 2)

    // position "suivi du rubis"
    tmp.follow.copy(camPos).addScaledVector(camTangent, -4.2 - wide * 5)
    tmp.follow.x += camOffset.x
    tmp.follow.y = WATER_Y + 9 + wide * 4 + camOffset.y
    // position "face à l'écran, plein cadre" (pile en face → image droite)
    tmp.fill.copy(SCREEN.center).addScaledVector(SCREEN.normal, 8.0)
    camera.position.lerpVectors(tmp.follow, tmp.fill, eFocus)

    if (eFocus > 0.985) {
      // verrouillage : vue parfaitement droite et fixe sur l'écran
      camera.up.set(0, 1, 0)
      lookTarget.current.copy(SCREEN.center)
    } else {
      // regard : du rubis vers le centre de l'écran, lissé
      tmp.look.copy(rubyPos).lerp(SCREEN.center, eFocus)
      lookTarget.current.lerp(tmp.look, Math.min(1, delta * 5))
    }

    // ── SORTIE DE LA GROTTE (tout en 3D) : on monte tout droit par le trou du
    // plafond, on remonte la cheminée et on débouche à la surface, sur le lac. ──
    if (ex > 0.0001) {
      tmp.exitPos.set(END.x, LAKE_Y + 6, END.z).addScaledVector(horizDir, 4)
      camera.position.lerp(tmp.exitPos, ex) // depuis la position "bout de grotte"
      // le regard part vers la lumière du haut (la sortie) puis bascule LENTEMENT
      // vers le ciel/l'horizon → on finit en regardant vers le haut
      tmp.exitLook.copy(upLook).lerp(horizonLook, smooth01((ex - 0.45) / 0.55))
      lookTarget.current.lerp(tmp.exitLook, smooth01(ex / 0.25))
      camera.up.set(0, 1, 0)
    }
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
            samples={2}
            resolution={128}
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
          {/* noyau blanc-chaud très brillant : le cœur de lumière de l'image */}
          <mesh scale={0.3}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color="#fff2e6" toneMapped={false} />
          </mesh>
          {/* halo radial doux autour du noyau (capté par le bloom) */}
          <sprite ref={glowSprite} scale={6}>
            <spriteMaterial
              map={coreGlowTex}
              transparent
              opacity={0.95}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          {/* anneau concentrique lumineux (look « iris ») */}
          <sprite scale={4.6}>
            <spriteMaterial
              map={ringTex}
              transparent
              opacity={0.8}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          {/* noyau rouge profond : teinte le centre vu à travers les facettes */}
          <mesh scale={0.62}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial
              color="#e21048"
              transparent
              opacity={0.45}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </mesh>
      </Trail>
      {/* lumière dédiée (layer 2) : fait scintiller le rubis sans toucher la scène */}
      <pointLight ref={gemLight} color="#ffd2c2" intensity={9} distance={7} decay={2} />
    </group>
  )
}
