import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U_END, LAKE_Y, smooth01 } from './config'
import { makeNormalTex } from './textures'
import { getDeviceProfile } from './deviceProfile'
import { MountainTerrain } from './MountainTerrain'
import { SkyDome, MountainClouds } from './Sky'


/** Le lac : grande nappe d'eau calme à la surface (orientée vers le haut → on la
 *  perce en montant), terrain de montagne réaliste tout autour, oiseaux à
 *  l'arrivée, et la lumière du jour qui plonge dans la cheminée. Tout s'allume
 *  avec la sortie (exitRef) ; sinon le fog le masque. Le soleil est DERRIÈRE nous
 *  (hors champ) : il éclaire de face les montagnes et les oiseaux qu'on regarde. */
export function LakeScene({ curve, noise, exitRef }) {
  const END = useMemo(() => curve.getPointAt(U_END), [curve])
  const horizDir = useMemo(() => {
    const t = curve.getTangentAt(U_END).clone()
    t.y = 0
    return t.normalize()
  }, [curve])
  // CONTRE-JOUR : le soleil est DERRIÈRE les montagnes (loin devant nous, +horizDir)
  // et BAS → il rase la ligne de crête : rim-light chaud sur les arêtes, faces
  // tournées vers nous plongées dans l'ombre → silhouettes massives et sombres
  // contre un ciel lumineux = écrasement d'échelle maximal. Léger décalage latéral
  // pour des ombres obliques. Une 2e lumière FROIDE (ciel) remplit doucement les
  // faces à l'ombre côté caméra (sinon noir total → on perd le grain).
  const side = useMemo(() => new THREE.Vector3(-horizDir.z, 0, horizDir.x), [horizDir])
  const lightPos = useMemo(
    () =>
      new THREE.Vector3(END.x, LAKE_Y + 360, END.z)
        .addScaledVector(horizDir, 900) // haut derrière la chaîne
        .addScaledVector(side, 750), // bien décalé sur le côté → lumière RASANTE qui sculpte les faces visibles
    [END, horizDir, side],
  )
  const fillPos = useMemo(
    () =>
      new THREE.Vector3(END.x, LAKE_Y + 240, END.z)
        .addScaledVector(horizDir, -520) // depuis derrière la caméra → éclaire les faces ombrées
        .addScaledVector(side, -260),
    [END, horizDir, side],
  )
  const root = useRef()
  const sky = useRef()
  const sun = useRef()
  const fill = useRef()
  const shaft = useRef()
  // SOLEIL (clé chaude) ET remplissage froid n'agissent que sur le layer 3 = les
  // montagnes. L'eau (layer 0) ne reçoit AUCUNE de ces directionnelles → zéro
  // reflet spéculaire au milieu du lac (une directional light ignore l'occlusion
  // du pic). L'eau n'est éclairée que par l'hémisphère (doux, diffus).
  useEffect(() => {
    sun.current?.layers.set(3)
    fill.current?.layers.set(3)
  }, [])

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
    // PERF : toute la scène du lac (montagnes ~58k tris, ciel, oiseaux, brume) n'est
    // RENDUE que pendant la sortie. Dans la grotte (exit≈0) le fog la masque de toute
    // façon → on la retire du rendu. Le seuil bas est invisible (tout est encore noir).
    if (root.current) root.current.visible = exitRef.current > 0.002
    const s = smooth01((exitRef.current - 0.2) / 0.8)
    if (sky.current) sky.current.intensity = 3.8 * s // ciel diffus relevé → bas plus lisible
    if (sun.current) sun.current.intensity = 8.2 * s // contre-jour chaud FORT (rim-light)
    if (fill.current) fill.current.intensity = 6.5 * s // remplissage froid des ombres (camera-facing)
    if (shaft.current) shaft.current.intensity = 240 * s
    uniforms.uTime.value += delta
    normalA.offset.x += delta * 0.006
    normalA.offset.y += delta * 0.004
    normalB.offset.x -= delta * 0.005
    normalB.offset.y += delta * 0.0065
  })

  return (
    <group ref={root} visible={false}>
      {/* ciel : dégradé + halo solaire + NUAGES volumétriques (fbm) dans le shader du dôme */}
      <SkyDome exitRef={exitRef} center={END} sunDir={horizDir} />
      {/* surface du lac : plan orienté vers le haut → invisible vu de dessous (on
          perce la surface en remontant), nappe d'eau visible une fois émergé */}
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[END.x, LAKE_Y, END.z]}>
        {/* lac : bleu-sarcelle clair et plus réfléchissant → l'eau se LIT bien (reflet
            doux du ciel/environnement) sans pour autant renvoyer un point chaud du
            soleil (le soleil reste sur le layer 3, pas sur l'eau). */}
        <meshPhysicalMaterial
          color="#33617a"
          roughness={0.34}
          metalness={0}
          clearcoat={getDeviceProfile().waterClearcoat ? 0.3 : 0}
          clearcoatRoughness={0.45}
          envMapIntensity={0.9}
          normalMap={normalA}
          normalScale={[0.12, 0.12]}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      {/* chaîne de montagnes 3D réaliste tout autour de l'horizon (base = niveau
          du lac → l'ourlet submergé fait émerger les versants de l'eau) */}
      <MountainTerrain center={END} noise={noise} baseY={LAKE_Y} sunDir={horizDir} />
      {/* nuages 3D qui ENVELOPPENT le pic et frôlent la pointe (orbite + occlusion par la montagne) */}
      <MountainClouds center={END} horizDir={horizDir} side={side} exitRef={exitRef} />
      {/* (MistBand retiré : ses sprites blancs non-tonemappés faisaient une tache
          lumineuse au milieu du lac + voilaient le bas de la montagne) */}
      {/* oiseaux : retirés pour l'instant (perf — meshes skinnés animés) */}
      {/* lumière du jour DANS la cheminée : portée volontairement courte (34) depuis
          LAKE_Y−40 → atteint au plus y≈−6, BIEN sous la surface (LAKE_Y) → elle
          n'éclaire plus du tout le centre du lac. */}
      <pointLight ref={shaft} color="#cfe6ff" intensity={0} distance={34} decay={1.7} position={[END.x, LAKE_Y - 40, END.z]} />
      <hemisphereLight ref={sky} args={['#dcebff', '#3c4f5c', 0]} />
      {/* CONTRE-JOUR chaud derrière la chaîne (rim-light) + remplissage froid des ombres */}
      <directionalLight ref={sun} color="#ffb56e" intensity={0} position={lightPos.toArray()} />
      <directionalLight ref={fill} color="#93b4dc" intensity={0} position={fillPos.toArray()} />
    </group>
  )
}
