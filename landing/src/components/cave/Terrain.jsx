import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TUBE_R, WATER_Y, U_SCREENS, U_END } from './config'
import { exitPath } from './caveGeometry'
import { makeNormalTex } from './textures'

/** Parois rocheuses — UN SEUL tunnel, fait d'UNE SEULE courbe : il suit le TRAJET
 *  (la boucle, de 0 à U_END) puis se PROLONGE par le chemin de sortie (exitPath, la
 *  même source que la caméra) qui se redresse et monte au lac. Une courbe → une
 *  TubeGeometry → une seule surface de roche CONTINUE qui se relève : plus de second
 *  mesh « cheminée » qui se devine comme une pièce rapportée, plus de trou à sceller.
 *  NB : la boucle `curve` reste la référence de TOUTE la chorégraphie ; ce tunnel
 *  n'est QUE le maillage, calé sur le même trajet + le même chemin de sortie. */
export function TunnelWalls({ curve, noise, rockNormal, rockRough }) {
  const tunnelCurve = useMemo(() => {
    const pts = [curve.getPointAt(0.98), curve.getPointAt(0.99)] // amorce dans le dos du départ
    const NJ = 64
    for (let k = 0; k <= NJ; k++) pts.push(curve.getPointAt((k / NJ) * U_END)) // TRAJET (suit la boucle)
    // SORTIE : on enchaîne le chemin de sortie (1er point = END, déjà présent → on saute)
    const exitPts = exitPath(curve).getPoints(48)
    for (let k = 1; k < exitPts.length; k++) pts.push(exitPts[k])
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
  }, [curve])

  const geometry = useMemo(() => {
    const TUBULAR = 480
    const RADIAL = 32
    const g = new THREE.TubeGeometry(tunnelCurve, TUBULAR, TUBE_R, RADIAL, false)
    // ÉLARGISSEMENT de la salle vidéo : repéré par DISTANCE MONDE au point de l'écran
    // (la paramétrisation de CE tunnel ≠ celle de la boucle → on ne compare plus u,
    // on compare la position monde du centre de chaque anneau).
    const screenC = curve.getPointAt(U_SCREENS)
    const ROOM_R = 42 // rayon monde d'influence de l'ouverture en salle
    const ringC = []
    for (let j = 0; j <= TUBULAR; j++) ringC.push(tunnelCurve.getPointAt(j / TUBULAR))
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
      // cloche d'ouverture autour de l'écran (inchangé, repéré par distance monde)
      const ring = ringC[Math.floor(i / (RADIAL + 1))]
      const dist = ring ? ring.distanceTo(screenC) : Infinity
      if (dist < ROOM_R) {
        const bump = 0.5 * (1 + Math.cos((dist / ROOM_R) * Math.PI)) // 1 au centre → 0
        v.addScaledVector(n, bump * 34)
      }
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
  }, [tunnelCurve, curve, noise])

  // grain de roche à densité CONSTANTE : le repeat de base (calé sur la boucle
  // entière) est remis à l'échelle par la longueur de CE tunnel → même échelle de
  // texel partout, montée comprise (aucune rupture de grain au redressement).
  const lenRatio = useMemo(() => tunnelCurve.getLength() / curve.getLength(), [tunnelCurve, curve])
  const normal = useMemo(() => {
    const t = rockNormal.clone()
    t.repeat.set(rockNormal.repeat.x * lenRatio, rockNormal.repeat.y)
    t.needsUpdate = true
    return t
  }, [rockNormal, lenRatio])
  const rough = useMemo(() => {
    const t = rockRough.clone()
    t.repeat.set(rockRough.repeat.x * lenRatio, rockRough.repeat.y)
    t.needsUpdate = true
    return t
  }, [rockRough, lenRatio])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        normalMap={normal}
        normalScale={[1.7, 1.7]}
        roughnessMap={rough}
        roughness={1}
        metalness={0.05}
        side={THREE.BackSide}
        // léger lift de la roche (atténué par le fog avec la distance). Volontairement
        // BAS → parois sombres ; c'est l'eau et le fond qui portent la lumière.
        emissive="#1b2a33"
        emissiveIntensity={0.12}
      />
    </mesh>
  )
}

/** Nappe d'eau : houle douce (géométrie) + 2 couches de rides (normal maps) +
 *  sheen fresnel sur l'ENVIRONNEMENT seulement. Ne réfléchit pas la scène,
 *  donc aucun reflet du rubis. */
export function Water() {
  // PERF : 80×80 au lieu de 110×110 (~12k→~6,5k sommets). Vagues dans le vertex
  // shader → maille un peu plus grossière, invisible sur l'eau sombre de la grotte.
  const geom = useMemo(() => new THREE.PlaneGeometry(440, 440, 80, 80), [])
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
        color="#115b5e"
        roughness={0.16}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.14}
        envMapIntensity={2.3}
        // teinte + glow turquoise discret : garantit le rendu turquoise même là où
        // l'eau ne reflète que l'environnement bleuté (knobs : color / emissive*).
        emissive="#0e5258"
        emissiveIntensity={0.22}
        normalMap={normalA}
        normalScale={[0.32, 0.32]}
        clearcoatNormalMap={normalB}
        clearcoatNormalScale={[0.28, 0.28]}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  )
}
