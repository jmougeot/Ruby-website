import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor, useProgress } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { createNoise3D } from 'simplex-noise'
import { useTunnelCurve, dampN, CAM, U_END } from './cave/config'
import { sampleTimeline } from './cave/scrollChoreography'
import { makeRockNormalTex, makeRoughnessTex } from './cave/textures'
import { TunnelWalls, Water } from './cave/Terrain'
import { Cascade } from './cave/Cascade'
import { EndLight } from './cave/EndLight'
import { RubyRig } from './cave/Ruby'
import { DemoScreens } from './cave/DemoScreen'
import { KeynoteCards } from './cave/KeynoteCards'
import { LakeScene } from './cave/LakeScene'
import { Atmosphere } from './cave/Atmosphere'

/** Position le long de la courbe = UNIQUEMENT le scroll (plus d'avance auto).
 *  breakRef = bris de l'écran (0→1), piloté par le scroll lui aussi.
 *  exitRef  = progression de la SORTIE verticale sur la dernière portion. */
const DEBUG_LAKE = typeof window !== 'undefined' && window.location.search.includes('debug=lake')
// DEBUG temporaire : ?debug=exit0.18 fige la remontée à une valeur d'exit donnée
// (caméra dans le puits) → permet de cadrer le raccord grotte↔cheminée pour inspection.
const DEBUG_EXIT = (() => {
  if (typeof window === 'undefined') return null
  const m = window.location.search.match(/debug=exit([0-9.]+)/)
  return m ? parseFloat(m[1]) : null
})()
function ScrollDriver({ scroll, uRef, exitRef, breakRef }) {
  useFrame((_, delta) => {
    if (DEBUG_LAKE) {
      uRef.current = U_END
      exitRef.current = 1
      breakRef.current = 1
      return
    }
    if (DEBUG_EXIT != null) {
      uRef.current = U_END
      exitRef.current = DEBUG_EXIT
      breakRef.current = 1
      return
    }
    const p = scroll?.current ?? 0
    // cibles BRUTES de la timeline (source unique : scrollChoreography)
    const { u, brk, exit } = sampleTimeline(p)
    // lissage homogène (tau en secondes) → colle au scroll, moins « caoutchouteux »
    uRef.current = dampN(uRef.current, u, CAM.uTau, delta)
    // bris SANS inertie : garanti 100% PILE à U_BREAK (cf. timeline) → Ruby, bloqué
    // jusque-là, ne repart jamais avant que la vidéo soit complètement cassée.
    breakRef.current = brk
    // sortie : remontée lissée vers le lac (paliers/pauses définis dans la timeline)
    exitRef.current = dampN(exitRef.current, exit, CAM.exitTau, delta)
  })
  return null
}

/** Prévient le parent quand la scène est VRAIMENT prête à l'écran : il faut que
 *  (1) tous les assets soient chargés (loading manager au repos) ET (2) la scène
 *  ait rendu quelques frames APRÈS ça. Sinon on ferme le loader sur un écran
 *  encore vide / des modèles qui « poppent ». */
function FirstFrame({ onReady }) {
  const { active, total } = useProgress()
  const framesAfterLoad = useRef(0)
  const fired = useRef(false)
  useFrame(() => {
    if (fired.current) return
    // assets en cours de chargement → on attend (active = il reste des items)
    if (active && total > 0) {
      framesAfterLoad.current = 0
      return
    }
    // chargés : on laisse passer 2 frames pour que tout soit dessiné
    framesAfterLoad.current += 1
    if (framesAfterLoad.current >= 2) {
      fired.current = true
      onReady?.()
    }
  })
  return null
}

export default function CaveScene({ active = true, scroll, onReady }) {
  const noise = useMemo(() => createNoise3D(), [])
  const curve = useTunnelCurve()
  const uRef = useRef(DEBUG_LAKE ? U_END : 0)
  const exitRef = useRef(DEBUG_LAKE ? 1 : 0) // 0→1 : remontée hors de la grotte vers le lac
  const breakRef = useRef(DEBUG_LAKE ? 1 : 0) // 0→1 : bris de l'écran vidéo (piloté par le scroll)
  // DPR adaptatif : NET par défaut (jusqu'à 2× sur écran HiDPI → texte des panneaux
  // piqué au lieu d'un canvas 1× upscalé par le navigateur), retombe à 1 si ça rame.
  // Plafond 2 = borne le coût GPU ; sur écran non-Retina HI_DPR vaut 1 → aucun surcoût.
  const HI_DPR = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2)
  const [dpr, setDpr] = useState(HI_DPR)
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
      frameloop={active || DEBUG_LAKE || DEBUG_EXIT != null ? 'always' : 'never'}
      camera={{ position: [0, 0, 0], fov: 80, far: 3200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG_LAKE || DEBUG_EXIT != null }}
      dpr={dpr}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(HI_DPR)} />
      <color attach="background" args={['#060a10']} />
      <fog attach="fog" args={['#060a10', 12, 155]} />

      {/* grotte sombre : l'avant est presque noir, la lumière vient du fond.
          Remplissage des PAROIS volontairement bas → parois sombres, contraste
          avec l'eau turquoise et le glow du fond (EndLight). */}
      <ambientLight color="#16252f" intensity={0.22} />
      <hemisphereLight args={['#132834', '#05060c', 0.22]} />

      <FirstFrame onReady={onReady} />
      <ScrollDriver scroll={scroll} uRef={uRef} exitRef={exitRef} breakRef={breakRef} />
      <Atmosphere exitRef={exitRef} />
      <TunnelWalls curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <Water />
      <LakeScene curve={curve} noise={noise} exitRef={exitRef} />
      <Suspense fallback={null}>
        <DemoScreens curve={curve} uRef={uRef} breakRef={breakRef} />
      </Suspense>
      {/* messages = cartes « verre dépoli » 3D premium (texte canvas net) */}
      <KeynoteCards curve={curve} uRef={uRef} exitRef={exitRef} />
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
        {/* seuil relevé (0.5→0.7) : le texte blanc des panneaux bloome moins → bords
            nets, mais les vraies sources lumineuses (rubis, lumière du fond) bloomment. */}
        <Bloom intensity={0.7} luminanceThreshold={0.7} luminanceSmoothing={0.9} />
        <Vignette eskil={false} offset={0.2} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  )
}
