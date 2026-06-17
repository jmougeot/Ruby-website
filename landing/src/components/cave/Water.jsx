import { useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_Y } from './config'
import { makeNormalTex } from './textures'

/** Nappe d'eau : houle douce (vagues dans le vertex shader → 0 coût CPU) + 2
 *  couches de rides (normal maps) + sheen fresnel sur l'ENVIRONNEMENT seulement.
 *  Ne réfléchit pas la scène → aucun reflet du rubis. */
export function Water() {
  const geom = useMemo(() => new THREE.PlaneGeometry(440, 440, 110, 110), [])
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
