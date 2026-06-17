import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useVideoTexture } from '@react-three/drei'
import * as THREE from 'three'
import { LEAD, U_SCREENS, screenTransform } from './config'

const SCREEN_W = 24
const SCREEN_H = 13.5

/** Grand écran démo en GRILLE DE FRAGMENTS : solide à l'approche (apparaît en
 *  fondu), puis chaque morceau s'envole quand le rubis le brise. */
export function DemoScreens({ curve, uRef }) {
  const tex = useVideoTexture('/ruby-hero.mp4', { muted: true, loop: true, start: true })
  const group = useRef()
  const fragRefs = useRef([])

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

  useFrame(() => {
    // fade TARDIF : invisible de loin (on voit la salle), apparaît à l'arrivée
    const a = THREE.MathUtils.clamp((uRef.current - 0.085) / 0.05, 0, 1)
    // bris : étalé sur une grande course de scroll → se brise très lentement
    const rubyU = THREE.MathUtils.clamp(uRef.current + LEAD, 0, 1)
    const brk = THREE.MathUtils.clamp((rubyU - U_SCREENS) / 0.18, 0, 1)
    const e = brk // déplacement proportionnel au scroll (pas d'accélération)

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
