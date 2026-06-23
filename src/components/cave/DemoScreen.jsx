import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { screenTransform } from './caveGeometry'

const SCREEN_W = 24
const SCREEN_H = 13.5

/** Grand écran démo en GRILLE DE FRAGMENTS : solide à l'approche (apparaît en
 *  fondu), puis chaque morceau s'envole quand le rubis le brise. */
export function DemoScreens({ curve, uRef, breakRef, videoRef }) {
  // VideoTexture MAISON (remplace drei/useVideoTexture → retire la dépendance hls.js,
  // inutile pour un MP4 simple). Bonus perf : on NE suspend PLUS sur le chargement de
  // la vidéo, donc la 1re image de la grotte n'attend plus le buffering de demo.mp4.
  // La vidéo reste sur sa 1re frame (pas d'autoplay) ; on la LANCE nous-mêmes quand
  // l'écran devient plein cadre (cf. useFrame). loop=false → elle joue une fois.
  const gl = useThree((s) => s.gl)
  const tex = useMemo(() => {
    const video = Object.assign(document.createElement('video'), {
      src: '/demo.mp4',
      crossOrigin: 'anonymous',
      muted: true,
      loop: false,
      playsInline: true,
      preload: 'auto',
    })
    const t = new THREE.VideoTexture(video)
    t.colorSpace = gl.outputColorSpace // couleurs identiques à drei (= sortie du renderer)
    return t
  }, [gl])

  // libère la texture + l'élément vidéo au démontage
  useEffect(
    () => () => {
      const v = tex.image
      tex.dispose()
      if (v) {
        v.pause?.()
        v.removeAttribute('src')
        v.load?.()
      }
    },
    [tex],
  )
  const group = useRef()
  const fragRefs = useRef([])
  const playing = useRef(false) // état lecture vidéo (évite de spammer play/pause)
  const started = useRef(false) // a déjà (re)démarré depuis 0 pour cette entrée plein écran

  const place = useMemo(() => screenTransform(curve), [curve])

  // grille de fragments : chaque morceau a sa géométrie (UV = sa portion vidéo)
  const frags = useMemo(() => {
    const COLS = 7
    const ROWS = 4
    const fw = SCREEN_W / COLS
    const fh = SCREEN_H / ROWS
    const out = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = -SCREEN_W / 2 + fw * (c + 0.5)
        const y = SCREEN_H / 2 - fh * (r + 0.5)
        const g = new THREE.PlaneGeometry(fw, fh)
        const u0 = c / COLS
        const u1 = (c + 1) / COLS
        const v0 = 1 - (r + 1) / ROWS
        const v1 = 1 - r / ROWS
        const uv = g.attributes.uv
        uv.setXY(0, u0, v1)
        uv.setXY(1, u1, v1)
        uv.setXY(2, u0, v0)
        uv.setXY(3, u1, v0)
        uv.needsUpdate = true
        const dir = new THREE.Vector3(x, y, 0).normalize()
        out.push({
          geo: g,
          x,
          y,
          dir,
          dist: 3 + Math.random() * 6,
          zc: 0.2 + Math.random() * 0.6, // vers la caméra
          spin: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4],
        })
      }
    }
    return out
  }, [])

  useEffect(() => {
    group.current?.lookAt(place.center.clone().addScaledVector(place.tangent, 12))
  }, [place])

  // l'écran est vu « par l'arrière » (plan orienté le long du tunnel) → l'image
  // arrivait EN MIROIR. On retourne la texture horizontalement (u → 1-u) pour la
  // remettre à l'endroit, indépendamment de la grille de fragments.
  useEffect(() => {
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.x = -1
    tex.offset.x = 1
    tex.needsUpdate = true
  }, [tex])

  // partage l'élément <video> (caché dans la texture) avec l'overlay DOM → barre de
  // lecture / play-pause (VideoControls). tex.image = HTMLVideoElement une fois chargé.
  useEffect(() => {
    if (videoRef) videoRef.current = tex.image ?? null
  }, [tex, videoRef])

  useFrame(() => {
    // fade TARDIF : invisible de loin (on voit la salle), apparaît à l'arrivée
    const a = THREE.MathUtils.clamp((uRef.current - 0.085) / 0.05, 0, 1)
    // bris : piloté par le scroll (breakRef), indépendant de la position de Ruby
    // → Ruby reste bloqué à l'écran tant que la vidéo n'est pas brisée à 100%
    const brk = THREE.MathUtils.clamp(breakRef.current, 0, 1)
    const e = brk // déplacement proportionnel au scroll (pas d'accélération)

    // PLEIN ÉCRAN : la caméra a plongé face à l'écran (même seuil `focus` que
    // Ruby.jsx). La vidéo NE SE LANCE qu'à ce moment-là — et DEPUIS LE DÉBUT — au lieu
    // de tourner en boucle en fond depuis l'arrivée. On la coupe une fois l'écran brisé.
    const focus = THREE.MathUtils.clamp((uRef.current - 0.09) / 0.045, 0, 1)
    const atFull = focus > 0.98
    if (!atFull) started.current = false // sorti du plein cadre (retour arrière) → réarme
    const shouldPlay = atFull && brk < 0.999
    const vid = tex.image
    if (vid && playing.current !== shouldPlay) {
      playing.current = shouldPlay
      if (shouldPlay) {
        if (!started.current) {
          started.current = true
          try { vid.currentTime = 0 } catch { /* pas encore seekable */ }
        }
        vid.play?.().catch(() => {})
      } else {
        vid.pause?.()
      }
    }

    frags.forEach((f, i) => {
      const m = fragRefs.current[i]
      if (!m) return
      m.position.set(f.x + f.dir.x * f.dist * e, f.y + f.dir.y * f.dist * e - 3 * e, f.zc * f.dist * e)
      m.rotation.set(f.spin[0] * e, f.spin[1] * e, f.spin[2] * e)
      const mat = m.material
      mat.opacity = a * (1 - brk)
      mat.visible = mat.opacity > 0.02
      mat.depthWrite = brk < 0.03 && a > 0.5 // écran solide → occulte le rubis
    })
  })

  return (
    <group ref={group} position={place.center}>
      {/* fragments de l'écran vidéo */}
      {frags.map((f, i) => (
        <mesh key={i} ref={(el) => { fragRefs.current[i] = el }} geometry={f.geo} position={[f.x, f.y, 0]}>
          <meshBasicMaterial map={tex} transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
