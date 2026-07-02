import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_Y } from './config'

/** Lumière du FOND : projecteur placé devant qui VISE plus loin dans le tunnel.
 *  Son cône éclaire les parois lointaines, l'avant reste sombre → la lumière
 *  vient vraiment de la profondeur, qu'on n'atteint jamais (la courbe la cache). */
export function EndLight({ curve, uRef }) {
  const spot = useRef()
  const target = useRef()
  const fill = useRef()
  // vecteurs RÉUTILISÉS (même modèle que RubyRig) : getPointAt sans cible alloue
  // un Vector3 par appel — ×3 par frame, pression GC inutile.
  const tmp = useMemo(
    () => ({ ps: new THREE.Vector3(), pt: new THREE.Vector3(), pf: new THREE.Vector3() }),
    [],
  )
  const lastU = useRef(Infinity)
  useFrame(() => {
    if (!spot.current || !target.current || !fill.current) return
    const base = uRef.current
    // la lumière ne dépend QUE de u : pendant les pauses de lecture, la sortie et le
    // lac, u est figé → rien à repositionner (le seuil fin laisse passer le moindre scroll)
    if (Math.abs(base - lastU.current) < 1e-4) return
    lastU.current = base
    const ps = curve.getPointAt(THREE.MathUtils.clamp(base + 0.14, 0, 1), tmp.ps)
    ps.y = WATER_Y + 7
    const pt = curve.getPointAt(THREE.MathUtils.clamp(base + 0.34, 0, 1), tmp.pt)
    pt.y = WATER_Y + 6
    spot.current.position.copy(ps)
    target.current.position.copy(pt)
    target.current.updateMatrixWorld()
    spot.current.target = target.current
    // remplissage très faible, lui aussi loin devant (jamais à l'avant)
    const pf = curve.getPointAt(THREE.MathUtils.clamp(base + 0.22, 0, 1), tmp.pf)
    pf.y = WATER_Y + 6
    fill.current.position.copy(pf)
  })
  return (
    <group>
      {/* lumière du fond ENCORE renforcée → glow du fond + GLINTS turquoise sur l'eau */}
      <spotLight ref={spot} color="#8fc6df" intensity={2200} distance={340} angle={0.95} penumbra={1} decay={1.15} />
      <object3D ref={target} />
      <pointLight ref={fill} color="#5f9fc0" intensity={180} distance={160} decay={1.5} />
    </group>
  )
}
