import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { createNoise3D } from 'simplex-noise'
import {
  useTunnelCurve,
  smooth01,
  trapezoidEase,
  dampN,
  CAM,
  U_ARRIVE,
  U_STOP,
  U_HOLD,
  U_BREAK,
  S_CAVE_END,
  S_EXIT_RISE,
  S_EXIT_HOLD,
  S_EXIT_END,
  EXIT_HOLD,
  U_END,
} from './cave/config'
import { makeRockNormalTex, makeRoughnessTex } from './cave/textures'
import { TunnelWalls, Water } from './cave/Terrain'
import { EndLight } from './cave/EndLight'
import { RubyRig } from './cave/Ruby'
import { DemoScreens } from './cave/DemoScreen'
import { CaveMessage, ExitMessage, MountainMessage } from './cave/CaveMessage'
import { LakeScene } from './cave/LakeScene'
import { ExitShaft } from './cave/ExitShaft'
import { Atmosphere } from './cave/Atmosphere'

/** Position le long de la courbe = UNIQUEMENT le scroll (plus d'avance auto).
 *  breakRef = bris de l'écran (0→1), piloté par le scroll lui aussi.
 *  exitRef  = progression de la SORTIE verticale sur la dernière portion. */
const DEBUG_LAKE = typeof window !== 'undefined' && window.location.search.includes('debug=lake')
function ScrollDriver({ scroll, uRef, exitRef, breakRef }) {
  useFrame((_, delta) => {
    if (DEBUG_LAKE) {
      uRef.current = U_END
      exitRef.current = 1
      breakRef.current = 1
      return
    }
    const p = scroll?.current ?? 0
    let scrollU
    let brk = 0
    if (p <= U_ARRIVE) {
      // trajet : profil TRAPÈZE → départ doux, vitesse constante, et arrive sur la
      // vidéo avec vitesse → 0 (raccord net avec la pause, sans à-coup)
      scrollU = U_STOP * trapezoidEase(p / U_ARRIVE)
    } else if (p <= U_HOLD) {
      // PAUSE : on est sur la vidéo, Ruby figé à l'écran, rien ne casse
      scrollU = U_STOP
    } else if (p <= U_BREAK) {
      // BRIS : Ruby reste BLOQUÉ à l'écran ; la vidéo se brise (au scroll) jusqu'à 100%
      scrollU = U_STOP
      brk = smooth01((p - U_HOLD) / (U_BREAK - U_HOLD))
    } else if (p <= S_CAVE_END) {
      // CROISIÈRE : profil TRAPÈZE → repart en douceur depuis le bris, puis vitesse
      // CONSTANTE sur toute la longueur (plus de milieu trop rapide), arrêt doux.
      brk = 1
      scrollU = U_STOP + trapezoidEase((p - U_BREAK) / (S_CAVE_END - U_BREAK)) * (U_END - U_STOP)
    } else {
      // au bout : figé sur la courbe, la suite du trajet est VERTICALE (sortie)
      brk = 1
      scrollU = U_END
    }
    // lissage homogène (tau en secondes) → colle au scroll, moins « caoutchouteux »
    uRef.current = dampN(uRef.current, scrollU, CAM.uTau, delta)
    // bris SANS inertie : la vidéo est garantie 100% brisée PILE à U_BREAK (peu
    // importe la vitesse de scroll) → Ruby, qui ne se débloque qu'à U_BREAK, ne
    // repart JAMAIS avant que le film soit complètement cassé.
    breakRef.current = brk
    // sortie hors de la grotte : remontée vers le lac sur S_CAVE_END→S_EXIT_END,
    // puis PAUSE sur le lac (exit=1) jusqu'à la fin → un scroll ne saute pas direct
    // aux sections suivantes ; il faut finir de scroller la section pour les atteindre.
    let exit
    if (p <= S_CAVE_END) {
      exit = 0
    } else if (p <= S_EXIT_RISE) {
      // SLIDE 3 : montée partielle dans le puits jusqu'au niveau du palier
      exit = EXIT_HOLD * smooth01((p - S_CAVE_END) / (S_EXIT_RISE - S_CAVE_END))
    } else if (p <= S_EXIT_HOLD) {
      // PALIER : bloqué dans la grotte, face au message (la caméra a le bon angle)
      exit = EXIT_HOLD
    } else {
      // SLIDE 4 : on repart et on sort finalement sur le lac
      exit = EXIT_HOLD + (1 - EXIT_HOLD) * smooth01((p - S_EXIT_HOLD) / (S_EXIT_END - S_EXIT_HOLD))
    }
    exitRef.current = dampN(exitRef.current, exit, CAM.exitTau, delta)
  })
  return null
}

export default function CaveScene({ active = true, scroll }) {
  const noise = useMemo(() => createNoise3D(), [])
  const curve = useTunnelCurve()
  const uRef = useRef(DEBUG_LAKE ? U_END : 0)
  const exitRef = useRef(DEBUG_LAKE ? 1 : 0) // 0→1 : remontée hors de la grotte vers le lac
  const breakRef = useRef(DEBUG_LAKE ? 1 : 0) // 0→1 : bris de l'écran vidéo (piloté par le scroll)
  // DPR adaptatif : baisse quand ça rame, remonte quand ça respire
  const [dpr, setDpr] = useState(1)
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
      frameloop={active || DEBUG_LAKE ? 'always' : 'never'}
      camera={{ position: [0, 0, 0], fov: 80, far: 3200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG_LAKE }}
      dpr={dpr}
    >
      <PerformanceMonitor onDecline={() => setDpr(0.75)} onIncline={() => setDpr(1)} />
      <color attach="background" args={['#060a10']} />
      <fog attach="fog" args={['#060a10', 12, 155]} />

      {/* grotte sombre : l'avant est presque noir, la lumière vient du fond */}
      <ambientLight color="#16252f" intensity={0.07} />
      <hemisphereLight args={['#132834', '#05060c', 0.13]} />

      <ScrollDriver scroll={scroll} uRef={uRef} exitRef={exitRef} breakRef={breakRef} />
      <Atmosphere exitRef={exitRef} />
      <TunnelWalls curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <ExitShaft curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <Water />
      <LakeScene curve={curve} noise={noise} exitRef={exitRef} />
      <Suspense fallback={null}>
        <DemoScreens curve={curve} uRef={uRef} breakRef={breakRef} />
      </Suspense>
      <CaveMessage curve={curve} uRef={uRef} exitRef={exitRef} />
      <ExitMessage curve={curve} exitRef={exitRef} />
      <MountainMessage curve={curve} exitRef={exitRef} />
      <EndLight curve={curve} uRef={uRef} />
      <RubyRig curve={curve} uRef={uRef} exitRef={exitRef} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="circle" intensity={2} color="#5a9cc0" position={[3, 2, -2]} scale={2.5} />
        <Lightformer form="rect" intensity={1.2} color="#dfeaf0" position={[-3, -1, -3]} scale={3} />
        {/* barre froide au-dessus → glint réfléchi sur l'eau (doux) */}
        <Lightformer form="rect" intensity={1.1} color="#cfe6f0" position={[0, 6, -4]} scale={[14, 2, 1]} />
      </Environment>

      <EffectComposer multisampling={4}>
        {/* PERF : sans mipmapBlur → flou en 1 passe au lieu de la pyramide
            downscale/upscale (plusieurs passes plein écran). Halo très légèrement
            plus serré, quasi imperceptible sur fond sombre. */}
        <Bloom intensity={0.7} luminanceThreshold={0.5} luminanceSmoothing={0.9} />
        <Vignette eskil={false} offset={0.2} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  )
}
