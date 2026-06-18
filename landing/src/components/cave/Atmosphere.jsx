import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { smooth01 } from './config'

/** Atmosphère : éclaircit fond + brouillard à mesure qu'on sort vers le lac. */
export function Atmosphere({ exitRef }) {
  const cave = useMemo(() => new THREE.Color('#060a10'), [])
  const sky = useMemo(() => new THREE.Color('#9fc3e0'), [])
  useFrame(({ scene }) => {
    const s = smooth01(exitRef.current)
    if (scene.background && scene.background.isColor) scene.background.copy(cave).lerp(sky, s)
    if (scene.fog) {
      scene.fog.color.copy(cave).lerp(sky, s)
      scene.fog.near = THREE.MathUtils.lerp(12, 120, s)
      // fog GLOBAL doux à la sortie (sinon le sommet du grand pic, loin en distance
      // 3D car haut, se fond dans le ciel → on « voit à travers »). La profondeur
      // atmosphérique des crêtes LOINTAINES est portée par le haze des sommets
      // (basé sur le rayon), qui n'altère pas le pic central de mi-plan.
      scene.fog.far = THREE.MathUtils.lerp(155, 3000, s)
    }
  })
  return null
}
