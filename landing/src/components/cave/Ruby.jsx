import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import * as THREE from 'three'
import { WATER_Y, LEAD, U_SCREENS, smooth01, screenTransform, CAM, damp3, dampN, exitChoreography } from './config'
import { makeGlowTex, makeRingTex } from './textures'

/** Gemme multi-couches :
 *  - `outer` : coque facettée anguleuse (verre transmissif),
 *  - `inner` : icosaèdre subdivisé avec une teinte VARIÉE par facette
 *    (magenta/rouge/orange) → inclusions cristallines, texture, profondeur. */
function useGemLayers() {
  return useMemo(() => {
    // Gemme « joaillerie » symétrique : on amène un AXE D'ORDRE 5 de l'icosaèdre
    // (passant par un SOMMET — la plus haute symétrie possible, 5 faces s'y
    // rejoignent) à la verticale, PUIS on aplatit le long de cet axe. La symétrie
    // d'ordre 5 (C5v, 5 plans miroir) est conservée → silhouette décagonale,
    // régulière de face comme de dessus.
    const PHI = (1 + Math.sqrt(5)) / 2
    const axis5 = new THREE.Vector3(0, 1, PHI).normalize() // sommet = axe d'ordre 5
    const upright = new THREE.Quaternion().setFromUnitVectors(axis5, new THREE.Vector3(0, 1, 0))

    const outer = new THREE.IcosahedronGeometry(2.35, 0)
    outer.applyQuaternion(upright)
    outer.scale(1.18, 0.92, 1.18) // aplatit le long de l'axe d'ordre 5 → reste symétrique

    const inner = new THREE.IcosahedronGeometry(1.55, 1) // detail 1 → 80 facettes
    inner.applyQuaternion(upright)
    inner.scale(1.18, 0.92, 1.18)
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
  const reflGroup = useRef()
  const hideRef = useRef(0)
  const firstFrame = useRef(true) // snap caméra/rubis à la 1re frame (pas de glissement depuis l'origine)
  const { outer: outerGeo, inner: innerGeo } = useGemLayers()
  const coreGlowTex = useMemo(() => makeGlowTex(), [])
  const ringTex = useMemo(() => makeRingTex(), [])
  // reflets du halo À L'INTÉRIEUR : petits glints additifs en 2 anneaux (symétrie
  // d'ordre 5, comme la gemme). Ils orbitent → le halo central semble se réfléchir
  // sur les facettes internes (scintillement).
  const reflections = useMemo(() => {
    const out = []
    const rings = [
      { r: 1.15, y: 0.4, n: 5, s: 0.5, o: 0.3, twist: 0 },
      { r: 0.8, y: -0.5, n: 5, s: 0.36, o: 0.2, twist: Math.PI / 5 },
    ]
    rings.forEach((ring) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + ring.twist
        out.push({ pos: [Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r], s: ring.s, o: ring.o })
      }
    })
    return out
  }, [])
  const camOffset = useMemo(() => new THREE.Vector3(), [])
  const lookTarget = useRef(new THREE.Vector3(0, WATER_Y + 6, 0))
  const SCREEN = useMemo(() => screenTransform(curve), [curve])
  // SORTIE : les 3 poses (A bout de grotte → B lecture → C lac) en coords monde,
  // ancrées sur le bout de grotte. Mêmes points que le message de sortie.
  const EXIT = useMemo(() => exitChoreography(curve), [curve])
  const tmp = useMemo(
    () => ({
      follow: new THREE.Vector3(),
      fill: new THREE.Vector3(),
      look: new THREE.Vector3(),
      rubyExit: new THREE.Vector3(),
      camGoal: new THREE.Vector3(),
      rubyGoal: new THREE.Vector3(),
      forward: new THREE.Vector3(),
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

    // ── phases (gating, inchangé) ──
    const exr = THREE.MathUtils.clamp(exitRef.current, 0, 1) // remontée BRUTE (repère des poses)
    const ex = smooth01(exr) // version lissée (FOV / lissages globaux)
    // approche : la salle s'ouvre tôt (la caméra recule un peu)
    const wide = THREE.MathUtils.clamp((rt - 0.04) / 0.08, 0, 1)
    // climax : la caméra plonge face à l'écran à l'ARRIVÉE (tunnel court)
    const focus = THREE.MathUtils.clamp((uRef.current - 0.09) / 0.045, 0, 1)
    // déverrouillage caméra : la vidéo se brise pendant que la caméra reste fixée
    // dessus, PUIS la caméra repart le long du tunnel (elle ne recule jamais).
    const brk = THREE.MathUtils.clamp((rt - U_SCREENS) / 0.105, 0, 1)
    // (1 - ex) : en sortie de grotte on annule tout résidu de focus écran
    const eFocus = focus * (1 - smooth01(brk)) * (1 - ex)

    // parallaxe souris RÉDUITE (= « légère vie »), lissée homogène
    camOffset.x = dampN(camOffset.x, pointer.x * CAM.parallax, CAM.parallaxTau, delta)
    camOffset.y = dampN(camOffset.y, pointer.y * CAM.parallaxY, CAM.parallaxTau, delta)

    // ── 1) CAMÉRA : un seul objectif, lissé (position) ──
    // suivi : posée derrière le point courant, le long de la tangente
    tmp.follow.copy(camPos).addScaledVector(camTangent, -(CAM.back + wide * CAM.backWide))
    tmp.follow.x += camOffset.x
    tmp.follow.y = WATER_Y + CAM.height + wide * CAM.heightWide + camOffset.y
    // face à l'écran, plein cadre (pile en face → image droite)
    tmp.fill.copy(SCREEN.center).addScaledVector(SCREEN.normal, 8.0)
    tmp.camGoal.lerpVectors(tmp.follow, tmp.fill, eFocus)
    // SORTIE : 3 poses (A=croisière vivante → B=lecture → C=lac) en 2 segments
    // lissés. L'ARRÊT de lecture = EXACTEMENT la pose B (exr = EXIT.read) ; plus de
    // lerp flou « 30 % du chemin ».
    if (exr > 0.0001) {
      const r = EXIT.read
      if (exr <= r) tmp.camGoal.lerp(EXIT.camB, smooth01(exr / r)) // A → B (montée → arrêt)
      else tmp.camGoal.copy(EXIT.camB).lerp(EXIT.camC, smooth01((exr - r) / (1 - r))) // B → C
    }
    // chase amorti : MOU en croisière (filtre l'ondulation des virages), NET au
    // climax écran / à la sortie. Snap à la 1re frame (évite un glissement depuis l'origine).
    const posTau = THREE.MathUtils.lerp(CAM.posTau, CAM.posLockTau, Math.max(eFocus, ex))
    if (firstFrame.current) camera.position.copy(tmp.camGoal)
    else damp3(camera.position, tmp.camGoal, posTau, delta)

    // ── 2) REGARD le long du tunnel (convergence CONTINUE — plus de bascule sèche) ──
    // point DEVANT sur la courbe, ramené à hauteur caméra → regard ~horizontal,
    // sans tangage, et plus de yaw qui « chasse » le rubis posé bas sur l'eau.
    tmp.look.copy(curve.getPointAt(THREE.MathUtils.clamp(t + CAM.lookAhead, 0, 1)))
    tmp.look.y = WATER_Y + CAM.lookHeight
    // climax : on vise PROGRESSIVEMENT le centre de l'écran (eFocus 0→1)
    tmp.look.lerp(SCREEN.center, eFocus)
    // SORTIE : on regarde le MESSAGE en montant (pose B), puis l'horizon (pose C)
    if (exr > 0.0001) {
      const r = EXIT.read
      if (exr <= r) tmp.look.lerp(EXIT.lookB, smooth01(exr / r))
      else tmp.look.copy(EXIT.lookB).lerp(EXIT.lookC, smooth01((exr - r) / (1 - r)))
    }
    camera.up.set(0, 1, 0)
    if (firstFrame.current) lookTarget.current.copy(tmp.look)
    else {
      // un seul lissage du regard, CONTINU : resserré au climax écran (eFocus) ET en
      // sortie (ex) → se cale net sur la vidéo puis sur les poses, sans saut sec ni
      // à-coup au début de la remontée.
      const lookTau = THREE.MathUtils.lerp(CAM.lookTau, CAM.lookLockTau, Math.max(eFocus, ex))
      damp3(lookTarget.current, tmp.look, lookTau, delta)
    }

    // FOV : large à la sortie (vertige d'échelle — les pics s'élancent hors-cadre), 80 sinon
    const targetFov = ex > 0.0001 ? THREE.MathUtils.lerp(80, 92, smooth01(ex)) : 80
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = targetFov
      camera.updateProjectionMatrix()
    }
    camera.lookAt(lookTarget.current)

    // ── 3) RUBIS ancré DEVANT la caméra (ressort vif → toujours cadré, « peut foncer ») ──
    tmp.forward.copy(lookTarget.current).sub(camera.position)
    if (tmp.forward.lengthSq() < 1e-6) tmp.forward.copy(camTangent)
    tmp.forward.normalize()
    // INTRO : au tout début, le rubis est posé BAS dans le cadre (près du bord
    // inférieur) — « il démarre d'ici » — puis remonte à sa hauteur de croisière
    // quand on commence à avancer (uRef → 0.1).
    const intro = smooth01(THREE.MathUtils.clamp(1 - uRef.current / 0.1, 0, 1))
    tmp.rubyGoal.copy(camera.position).addScaledVector(tmp.forward, CAM.rubyAhead)
    // posé bas dans le cadre mais REMONTÉ au départ (ne touche pas la bulle « Suis-moi »),
    // puis redescend à sa hauteur de croisière quand on commence à avancer.
    tmp.rubyGoal.y += -CAM.rubyDrop + intro * 1.5 + Math.sin(e * 0.7) * 0.5 // posé bas + respiration
    // BRIS : le rubis crève l'écran (cible = centre de l'écran)
    tmp.rubyGoal.lerp(SCREEN.center, eFocus)
    // SORTIE : le rubis MÈNE la montée (pose B, devant la caméra) puis se pose sur
    // le lac (pose C) — mêmes 2 segments que la caméra.
    if (exr > 0.0001) {
      const r = EXIT.read
      if (exr <= r) {
        tmp.rubyGoal.lerp(EXIT.rubyB, smooth01(exr / r))
      } else {
        tmp.rubyExit.copy(EXIT.rubyC)
        tmp.rubyExit.y += Math.sin(e * 0.7) * 0.4 // respiration sur l'eau
        tmp.rubyGoal.copy(EXIT.rubyB).lerp(tmp.rubyExit, smooth01((exr - r) / (1 - r)))
      }
    }
    if (mesh.current) {
      if (firstFrame.current) mesh.current.position.copy(tmp.rubyGoal)
      else damp3(mesh.current.position, tmp.rubyGoal, CAM.rubyTau, delta)
      mesh.current.rotation.y = e * 0.25 // rotation lente sur lui-même (vivant)
      mesh.current.rotation.x = Math.sin(e * 0.3) * 0.18
    }
    firstFrame.current = false

    // les inclusions contre-tournent → scintillement interne, profondeur
    if (inner.current) {
      inner.current.rotation.y = -e * 0.35
      inner.current.rotation.z = e * 0.22
    }
    // le cœur de lumière respire légèrement (vivant) — halo réduit
    if (glowSprite.current) glowSprite.current.scale.setScalar(2.6 * (1 + Math.sin(e * 1.6) * 0.06))
    // les reflets internes orbitent → scintillement (réflexions du halo)
    if (reflGroup.current) {
      reflGroup.current.rotation.y = e * 0.4
      reflGroup.current.rotation.x = Math.sin(e * 0.45) * 0.25
    }
    // petite lumière chaude au-dessus du rubis → étincelles sur les facettes
    if (gemLight.current && mesh.current) {
      gemLight.current.position.set(
        mesh.current.position.x + 1.2,
        mesh.current.position.y + 1.8,
        mesh.current.position.z + 1.2,
      )
    }

    // cacher le rubis tant que l'écran est plein et intact (sinon il transperce),
    // le faire réapparaître au bris (il brise l'écran et reprend la tête)
    hideRef.current += (eFocus - hideRef.current) * Math.min(1, delta * 6)
    // 0.5 = gemme à demi-taille. Tout (coque, inclusions, halo, cœurs) est enfant
    // du mesh → mis à l'échelle ensemble. Multiplié par le fondu d'apparition.
    const shown = Math.max(0.001, 1 - hideRef.current)
    if (mesh.current) {
      mesh.current.scale.setScalar(0.5 * shown)
      // PERF : quand le rubis est ~invisible (phase vidéo + bris), on le retire du
      // rendu → on saute son draw ET le re-rendu de scène du verre (coût/frame le + gros).
      const visible = shown > 0.02
      mesh.current.visible = visible
      if (gemLight.current) gemLight.current.visible = visible
    }
  })

  return (
    <group>
      {/* bref filet de lumière dans son sillage — comme s'il nous guidait */}
      <Trail width={1.05} length={4} decay={1.3} color={new THREE.Color('#ff5566')} attenuation={(w) => w * w}>
        <mesh ref={mesh} geometry={outerGeo}>
          {/* PERF : coque en meshPhysicalMaterial (reflets venant de l'Environment,
              calculé UNE fois) au lieu de MeshTransmissionMaterial qui re-rendait
              toute la scène chaque frame. La réfraction réelle était quasi invisible
              sur un petit rubis au fond sombre → look quasi identique, coût ~nul. */}
          <meshPhysicalMaterial
            color="#c01640"
            emissive="#ff1f4c"
            emissiveIntensity={0.16}
            roughness={0.06}
            metalness={0}
            transparent
            opacity={0.74}
            ior={1.77}
            reflectivity={0.6}
            clearcoat={1}
            clearcoatRoughness={0.08}
            envMapIntensity={1.3}
            flatShading
          />
          {/* inclusions : facettes de teintes variées, contre-tournent → texture */}
          <mesh ref={inner} geometry={innerGeo}>
            <meshStandardMaterial
              vertexColors
              emissive="#ff2a52"
              emissiveIntensity={0.4}
              roughness={0.3}
              metalness={0.1}
              transparent
              opacity={0.32}
              flatShading
            />
          </mesh>
          {/* halo radial doux : dessiné PAR-DESSUS le verre (depthTest off) → on le
              voit bien à l'intérieur de la gemme transparente, sans être masqué par
              la facette avant qui écrit la profondeur. renderOrder élevé = après le verre. */}
          <sprite ref={glowSprite} scale={2.8} renderOrder={3}>
            <spriteMaterial
              map={coreGlowTex}
              transparent
              opacity={0.5}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          {/* reflets du halo À L'INTÉRIEUR : petits glints qui orbitent (scintillement) */}
          <group ref={reflGroup}>
            {reflections.map((r, i) => (
              <sprite key={i} position={r.pos} scale={r.s} renderOrder={3}>
                <spriteMaterial
                  map={coreGlowTex}
                  color="#ffd0d8"
                  transparent
                  opacity={r.o}
                  depthWrite={false}
                  depthTest={false}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </sprite>
            ))}
          </group>
          {/* anneau concentrique lumineux (look « iris ») */}
          <sprite scale={2.4} renderOrder={3}>
            <spriteMaterial
              map={ringTex}
              transparent
              opacity={0.45}
              depthWrite={false}
              depthTest={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          {/* noyau blanc-chaud très brillant : le cœur de lumière de l'image */}
          <mesh scale={0.34} renderOrder={4}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshBasicMaterial color="#fff4ea" toneMapped={false} depthTest={false} />
          </mesh>
          {/* noyau rouge profond : teinte le centre vu à travers les facettes */}
          <mesh scale={0.62} renderOrder={2}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial
              color="#e21048"
              transparent
              opacity={0.45}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
        </mesh>
      </Trail>
      {/* lumière dédiée (layer 2) : fait scintiller le rubis sans toucher la scène */}
      <pointLight ref={gemLight} color="#ffd2c2" intensity={9} distance={7} decay={2} />
    </group>
  )
}
