import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { createNoise3D } from 'simplex-noise'
import {
  useTunnelCurve,
  IDLE_SPEED,
  U_ARRIVE,
  U_STOP,
  U_HOLD,
  S_CAVE_END,
  U_END,
} from './cave/config'
import { makeRockNormalTex, makeRoughnessTex } from './cave/textures'
import { TunnelWalls, WallFeatures, Water } from './cave/Terrain'
import { EndLight } from './cave/EndLight'
import { RubyRig } from './cave/Ruby'
import { DemoScreens } from './cave/DemoScreen'
import { LakeScene } from './cave/LakeScene'
import { ExitShaft } from './cave/ExitShaft'
import { Atmosphere } from './cave/Atmosphere'

/** Position le long de la courbe = scroll (avec easing/pause/bris) + dérive lente,
 *  et progression de la SORTIE verticale (exitRef) sur la dernière portion. */
function ScrollDriver({ scroll, uRef, exitRef }) {
  const drift = useRef(0)
  useFrame((_, delta) => {
    drift.current += delta * IDLE_SPEED // avance toujours, très lentement
    const p = scroll?.current ?? 0
    let scrollU
    if (p <= U_ARRIVE) {
      // trajet : ease-out FORT → ralentit vraiment avant d'arriver sur la vidéo
      const q = p / U_ARRIVE
      const ease = 1 - Math.pow(1 - q, 3)
      scrollU = U_STOP * ease
    } else if (p <= U_HOLD) {
      // PAUSE : on est sur la vidéo, tout est figé → rien ne casse même en scrollant
      scrollU = U_STOP
    } else if (p <= S_CAVE_END) {
      // bris + suite : re-scroller après la pause pour briser puis rouler au bout.
      // ease-in (q²) → Ruby repart DOUCEMENT juste après la vidéo, puis accélère
      const q = (p - U_HOLD) / (S_CAVE_END - U_HOLD)
      const ease = q * q
      scrollU = U_STOP + ease * (U_END - U_STOP)
    } else {
      // au bout : figé sur la courbe, la suite du trajet est VERTICALE (sortie)
      scrollU = U_END
    }
    // la dérive (au repos) est plafonnée à l'écran → ne brise jamais toute seule
    const target = Math.max(scrollU, Math.min(drift.current, U_STOP))
    uRef.current += (target - uRef.current) * Math.min(1, delta * 3.2) // peu d'inertie
    // sortie hors de la grotte : dernière portion du scroll → remontée vers le lac
    const exit = p <= S_CAVE_END ? 0 : (p - S_CAVE_END) / (1 - S_CAVE_END)
    exitRef.current += (exit - exitRef.current) * Math.min(1, delta * 3.2)
  })
  return null
}

export default function CaveScene({ active = true, scroll }) {
  const noise = useMemo(() => createNoise3D(), [])
  const curve = useTunnelCurve()
  const uRef = useRef(0)
  const exitRef = useRef(0) // 0→1 : remontée hors de la grotte vers le lac
  // DPR adaptatif : baisse quand ça rame, remonte quand ça respire
  const [dpr, setDpr] = useState(1.5)
  const rockNormal = useMemo(() => {
    const t = makeRockNormalTex(768)
    t.repeat.set(34, 7)
    return t
  }, [])
  const rockRough = useMemo(() => {
    const t = makeRoughnessTex(512)
    t.anisotropy = 8
    t.repeat.set(18, 4)
    return t
  }, [])

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 0], fov: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={dpr}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
      <color attach="background" args={['#060a10']} />
      <fog attach="fog" args={['#060a10', 12, 155]} />

      {/* grotte sombre : l'avant est presque noir, la lumière vient du fond */}
      <ambientLight color="#16252f" intensity={0.07} />
      <hemisphereLight args={['#132834', '#05060c', 0.13]} />

      <ScrollDriver scroll={scroll} uRef={uRef} exitRef={exitRef} />
      <Atmosphere exitRef={exitRef} />
      <TunnelWalls curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <WallFeatures curve={curve} noise={noise} rockNormal={rockNormal} />
      <ExitShaft curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <Water />
      <LakeScene curve={curve} noise={noise} exitRef={exitRef} />
      <Suspense fallback={null}>
        <DemoScreens curve={curve} uRef={uRef} />
      </Suspense>
      <EndLight curve={curve} uRef={uRef} />
      <RubyRig curve={curve} uRef={uRef} exitRef={exitRef} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="circle" intensity={2} color="#5a9cc0" position={[3, 2, -2]} scale={2.5} />
        <Lightformer form="rect" intensity={1.2} color="#dfeaf0" position={[-3, -1, -3]} scale={3} />
        {/* barre froide au-dessus → glint réfléchi sur l'eau (doux) */}
        <Lightformer form="rect" intensity={1.1} color="#cfe6f0" position={[0, 6, -4]} scale={[14, 2, 1]} />
      </Environment>

      <EffectComposer multisampling={2}>
        <Bloom intensity={0.65} luminanceThreshold={0.5} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  )
}
