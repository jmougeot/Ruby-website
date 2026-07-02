import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor, useProgress } from '@react-three/drei'
import { createNoise3D } from 'simplex-noise'
import { CAM, U_START, U_END } from './cave/config'
import { useTunnelCurve, dampN } from './cave/caveGeometry'
import { sampleTimeline } from './cave/scrollChoreography'
import { makeRockNormalTex, makeRoughnessTex } from './cave/textures'
import { TunnelWalls, Water } from './cave/Terrain'
import { EndLight } from './cave/EndLight'
import { RubyRig } from './cave/Ruby'
import { DemoScreens } from './cave/DemoScreen'
import { KeynoteCards } from './cave/KeynoteCards'
import { LakeScene } from './cave/LakeScene'
import { Atmosphere } from './cave/Atmosphere'
import { CAPTURE, getCaptureProgress, setCaptureReady } from './cave/capture'
import { getDeviceProfile } from './cave/deviceProfile'

// (plus de décodeur Draco : le seul modèle, PineTree.glb, est livré non compressé →
//  zéro aller-retour CDN gstatic au 1er rendu.)

// Post-traitement (Bloom + Vignette) en CHUNK LAZY, monté après la 1re image (cf.
// showPost) → ~55 Ko gzip hors du chunk critique de la scène, et la compilation des
// shaders de Bloom ne retarde plus le 1er rendu.
const CavePost = lazy(() => import('./cave/CavePost'))

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
// ?perf : journalise le temps (depuis l'ouverture de la page) aux étapes clés de l'init
// 3D → permet de voir OÙ partent les secondes de chargement (génération textures,
// création du contexte WebGL, 1re image prête). Inactif sans le flag.
const PERF = typeof window !== 'undefined' && window.location.search.includes('perf')
const perfMark = (label) => {
  if (PERF) console.log(`[perf] +${performance.now().toFixed(0)}ms — ${label}`)
}

function ScrollDriver({ scroll, uRef, exitRef, breakRef }) {
  useFrame((_, delta) => {
    if (CAPTURE) {
      // mode capture : progression imposée par le script, AUCUN lissage → la même
      // valeur de p produit toujours exactement la même image (rendu déterministe).
      const { u, brk, exit } = sampleTimeline(getCaptureProgress())
      uRef.current = u
      breakRef.current = brk
      exitRef.current = exit
      return
    }
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
    // bris : lissé COMME le reste (tau court) → l'éclatement des fragments suit le
    // scroll sans saccader sur les pas de molette/aimant. La garantie « écran cassé
    // avant que Ruby reparte » tient toujours : Ruby ne lit pas breakRef (sa réappari-
    // tion dépend de sa position, cf. Ruby.jsx) et la cible reste à 1 toute la croisière.
    breakRef.current = dampN(breakRef.current, brk, CAM.breakTau, delta)
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
      if (CAPTURE) setCaptureReady() // débloque le script de capture
      onReady?.()
    }
  })
  return null
}

export default function CaveScene({ active = true, scroll, onReady, videoRef, locale = 'en' }) {
  const noise = useMemo(() => createNoise3D(), [])
  const curve = useTunnelCurve()
  const uRef = useRef(DEBUG_LAKE ? U_END : U_START) // départ décalé dans la grotte (pas u=0)
  const exitRef = useRef(DEBUG_LAKE ? 1 : 0) // 0→1 : remontée hors de la grotte vers le lac
  const breakRef = useRef(DEBUG_LAKE ? 1 : 0) // 0→1 : bris de l'écran vidéo (piloté par le scroll)
  // Profil d'appareil (desktop net vs mobile allégé) décidé UNE fois au montage, comme
  // `use3D` dans Hero. Pilote DPR, taille des textures, résolution d'environnement et
  // MSAA du post-traitement → tient le framerate sur GPU mobile sans changer la scène.
  const profile = useMemo(getDeviceProfile, [])
  // DPR adaptatif : NET par défaut (jusqu'à `dprCap`× sur écran HiDPI → texte des panneaux
  // piqué au lieu d'un canvas 1× upscalé par le navigateur). Plafond = borne le coût GPU
  // (2 desktop / 1.5 mobile) ; sur écran non-Retina HI_DPR vaut 1 → aucun surcoût.
  const HI_DPR = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, profile.dprCap)
  // QUALITÉ ADAPTATIVE GRADUÉE : le PerformanceMonitor fait évoluer un facteur 0→1
  // (départ 1 = net). Avant : tout-ou-rien DPR 2↔1 → un seul GROS saut, visible et
  // souvent insuffisant. Maintenant le DPR descend par paliers de 0,25 et, sous 0,4,
  // on coupe aussi le MSAA du composer (poste fragment le plus cher) — dégradation
  // douce, remontée pareille quand le framerate revient.
  const [perfFactor, setPerfFactor] = useState(1)
  const dpr = Math.max(1, Math.round((1 + (HI_DPR - 1) * perfFactor) * 4) / 4)
  const msaa = perfFactor < 0.4 ? 0 : profile.multisampling
  // post-traitement différé : monté seulement APRÈS la 1re image. En capture/debug on
  // le veut tout de suite (rendu déterministe / cadrage fidèle du décor).
  const [showPost, setShowPost] = useState(CAPTURE || DEBUG_LAKE || DEBUG_EXIT != null)
  // ferme le loader (onReady) PUIS monte Bloom à la frame suivante → le 1er rendu ne
  // paie pas la compilation des shaders ; le glow « pop » juste après.
  const handleReady = () => {
    perfMark('READY — 1re image prête, le loader se ferme')
    onReady?.()
    if (!showPost) requestAnimationFrame(() => setShowPost(true))
  }
  const rockNormal = useMemo(() => {
    const t0 = performance.now()
    // 512 plutôt que 768 : la normale est répétée 34×7 → chaque tuile est minuscule à
    // l'écran, la perte de finesse est imperceptible, mais le calcul du bruit (≈14
    // octaves × size²) chute de ~55 %. Coût n°1 de l'init de la scène.
    const t = makeRockNormalTex(profile.texSize)
    t.repeat.set(34, 7)
    perfMark(`rockNormal(${profile.texSize}) généré (${(performance.now() - t0).toFixed(0)}ms)`)
    return t
  }, [profile.texSize])
  const rockRough = useMemo(() => {
    const t0 = performance.now()
    const t = makeRoughnessTex(profile.texSize)
    t.anisotropy = 8
    t.repeat.set(18, 4)
    perfMark(`rockRough(${profile.texSize}) généré (${(performance.now() - t0).toFixed(0)}ms)`)
    return t
  }, [profile.texSize])

  return (
    <Canvas
      frameloop={active || DEBUG_LAKE || DEBUG_EXIT != null || CAPTURE ? 'always' : 'never'}
      camera={{ position: [0, 0, 0], fov: 80, far: 3200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG_LAKE || DEBUG_EXIT != null || CAPTURE }}
      dpr={dpr}
      onCreated={() => perfMark('contexte WebGL créé')}
    >
      <PerformanceMonitor factor={1} onChange={({ factor }) => setPerfFactor(factor)} />
      <color attach="background" args={['#060a10']} />
      <fog attach="fog" args={['#060a10', 12, 155]} />

      {/* grotte sombre : l'avant est presque noir, la lumière vient du fond.
          Remplissage des PAROIS volontairement bas → parois sombres, contraste
          avec l'eau turquoise et le glow du fond (EndLight). */}
      <ambientLight color="#16252f" intensity={0.22} />
      <hemisphereLight args={['#132834', '#05060c', 0.22]} />

      <FirstFrame onReady={handleReady} />
      <ScrollDriver scroll={scroll} uRef={uRef} exitRef={exitRef} breakRef={breakRef} />
      <Atmosphere exitRef={exitRef} />
      <TunnelWalls curve={curve} noise={noise} rockNormal={rockNormal} rockRough={rockRough} />
      <Water />
      <LakeScene curve={curve} noise={noise} exitRef={exitRef} />
      <Suspense fallback={null}>
        <DemoScreens curve={curve} uRef={uRef} breakRef={breakRef} videoRef={videoRef} />
      </Suspense>
      {/* messages = cartes « verre dépoli » 3D premium (texte canvas net) */}
      <KeynoteCards curve={curve} uRef={uRef} exitRef={exitRef} locale={locale} />
      <EndLight curve={curve} uRef={uRef} />
      <RubyRig curve={curve} uRef={uRef} exitRef={exitRef} />
      <Environment resolution={profile.envResolution} frames={1}>
        <Lightformer form="circle" intensity={2} color="#5a9cc0" position={[3, 2, -2]} scale={2.5} />
        <Lightformer form="rect" intensity={1.2} color="#dfeaf0" position={[-3, -1, -3]} scale={3} />
        {/* barre froide au-dessus → glint réfléchi sur l'eau (doux) */}
        <Lightformer form="rect" intensity={1.1} color="#cfe6f0" position={[0, 6, -4]} scale={[14, 2, 1]} />
      </Environment>

      {/* post-traitement (Bloom + Vignette) : chunk lazy, monté après la 1re image.
          MSAA du composer piloté par le profil (0 sur mobile) ET par le facteur de
          perf (coupé sous 0,4 quand ça rame vraiment). */}
      <Suspense fallback={null}>{showPost && <CavePost multisampling={msaa} />}</Suspense>
    </Canvas>
  )
}
