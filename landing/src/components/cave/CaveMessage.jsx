import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U_END, LAKE_Y, messageTransform } from './config'

const PLANE_W = 22
const PLANE_H = 9

// ── Contenu des messages (à ajuster plus tard) ──
const TITLE = "Ruby finds what you're missing."
const SUBTITLE = ''
const EXIT_TITLE = 'The right signal, at the right moment.'
const MOUNTAIN_TITLE = 'Until excellence becomes a habit'

/** Texture canvas : texte net, lumineux, fond transparent → flotte dans la grotte
 *  sans « cadre » d'écran. Facile à éditer (TITLE/SUBTITLE ci-dessus). */
function makeTextTexture(title, subtitle = '') {
  const W = 1024
  const H = Math.round((W * PLANE_H) / PLANE_W)
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.shadowColor = 'rgba(120, 190, 230, 0.9)'
  ctx.shadowBlur = 32
  ctx.fillStyle = '#eaf4fb'
  // taille auto : on réduit la police pour que le titre tienne dans la largeur
  let fontSize = Math.round(W * 0.072)
  const maxW = W * 0.9
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
  const tw = ctx.measureText(title).width
  if (tw > maxW) {
    fontSize = Math.floor((fontSize * maxW) / tw)
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
  }

  const cy = subtitle ? H * 0.42 : H * 0.5
  ctx.fillText(title, W / 2, cy)

  if (subtitle) {
    ctx.shadowBlur = 16
    ctx.fillStyle = 'rgba(200, 224, 240, 0.85)'
    ctx.font = `400 ${Math.round(W * 0.04)}px Inter, system-ui, sans-serif`
    ctx.fillText(subtitle, W / 2, H * 0.62)
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** Message figé en fin de grotte : fondu d'entrée quand on arrive au bout
 *  (uRef → U_END), figé, puis fondu de sortie dès que la caméra remonte (exitRef). */
export function CaveMessage({ curve, uRef, exitRef }) {
  const group = useRef()
  const matRef = useRef()
  const tex = useMemo(() => makeTextTexture(TITLE, SUBTITLE), [])
  const place = useMemo(() => messageTransform(curve), [curve])

  useEffect(() => {
    // face à la caméra qui approche (regarde vers l'arrière du tunnel)
    group.current?.lookAt(place.center.clone().addScaledVector(place.tangent, -12))
  }, [place])

  useEffect(() => () => tex.dispose(), [tex])

  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    // entrée : apparaît sur la fin de croisière, juste avant le bout (U_END)
    const appear = THREE.MathUtils.clamp((uRef.current - (U_END - 0.02)) / 0.015, 0, 1)
    // sortie : disparaît dès que la remontée commence
    const leave = 1 - THREE.MathUtils.clamp(exitRef.current * 3, 0, 1)
    mat.opacity = appear * leave
    mat.visible = mat.opacity > 0.01
  })

  return (
    <group ref={group} position={place.center}>
      <mesh>
        <planeGeometry args={[PLANE_W, PLANE_H]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/** Message pendant la remontée verticale : posé dans le puits au-dessus du bout
 *  de grotte, FACE caméra en permanence (billboard). Apparaît en milieu de montée,
 *  s'efface en haut (à l'arrivée sur le lac). */
export function ExitMessage({ curve, exitRef }) {
  const group = useRef()
  const matRef = useRef()
  const tex = useMemo(() => makeTextTexture(EXIT_TITLE), [])

  useEffect(() => () => tex.dispose(), [tex])

  // ancré DYNAMIQUEMENT devant la caméra pendant le palier → toujours cadré, quel
  // que soit l'angle exact de la remontée (un peu sous le centre = « bas » mais visible).
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const mat = matRef.current
    if (!mat || !group.current) return
    const ex = THREE.MathUtils.clamp(exitRef.current, 0, 1)
    const appear = THREE.MathUtils.clamp((ex - 0.12) / 0.18, 0, 1)
    const leave = 1 - THREE.MathUtils.clamp((ex - 0.62) / 0.2, 0, 1)
    mat.opacity = appear * leave
    mat.visible = mat.opacity > 0.01
    if (!mat.visible) return
    camera.getWorldDirection(fwd)
    // 40 m devant la caméra, abaissé de 6 → texte dans le bas-centre du cadre
    tmp.copy(camera.position).addScaledVector(fwd, 40)
    tmp.y -= 6
    group.current.position.copy(tmp)
    group.current.lookAt(camera.position) // billboard
  })

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[PLANE_W, PLANE_H]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

const MOUNT_W = 80
const MOUNT_H = 32

/** Message final dans la scène du lac/montagne : grand billboard suspendu au-dessus
 *  du lac, face à la caméra. N'apparaît qu'une fois SORTI sur le lac (exitRef → 1). */
export function MountainMessage({ curve, exitRef }) {
  const group = useRef()
  const matRef = useRef()
  const tex = useMemo(() => makeTextTexture(MOUNTAIN_TITLE), [])
  // suspendu en avant (vers la montagne) et haut → dans le champ de la caméra
  // qui regarde vers les cimes une fois sur le lac.
  const pos = useMemo(() => {
    const end = curve.getPointAt(U_END)
    const t = curve.getTangentAt(U_END).clone()
    t.y = 0
    t.normalize()
    return new THREE.Vector3(end.x, LAKE_Y + 90, end.z).addScaledVector(t, 150)
  }, [curve])

  useEffect(() => () => tex.dispose(), [tex])

  useFrame(({ camera }) => {
    const mat = matRef.current
    if (!mat || !group.current) return
    const ex = THREE.MathUtils.clamp(exitRef.current, 0, 1)
    // apparaît seulement une fois bien sorti sur le lac
    mat.opacity = THREE.MathUtils.clamp((ex - 0.82) / 0.16, 0, 1)
    mat.visible = mat.opacity > 0.01
    if (mat.visible) group.current.lookAt(camera.position) // billboard
  })

  return (
    <group ref={group} position={pos}>
      <mesh>
        <planeGeometry args={[MOUNT_W, MOUNT_H]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
