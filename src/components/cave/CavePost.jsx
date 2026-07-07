import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

// ─────────────────────────────────────────────────────────────────────────────
// POST-TRAITEMENT (Bloom + Vignette) ISOLÉ dans son propre module.
//
// Chargé en LAZY par CaveScene, monté seulement APRÈS la 1re image. Deux bénéfices :
//   • ~55 Ko gzip (postprocessing) sortent du chunk critique de la scène ;
//   • la compilation des shaders de Bloom (plusieurs passes plein écran) ne retarde
//     plus le 1er rendu → le loader se ferme plus tôt, le glow apparaît juste après.
// Réglages STRICTEMENT identiques à la version inline d'avant (zéro changement visuel
// une fois monté).
//
// `multisampling` (MSAA du composer) est piloté par le profil d'appareil (4, coupé
// à 0 par la qualité adaptative si le framerate plonge — l'antialias géométrique
// est déjà off).
// ─────────────────────────────────────────────────────────────────────────────
export default function CavePost({ multisampling = 4 }) {
  return (
    <EffectComposer multisampling={multisampling}>
      {/* PERF : sans mipmapBlur → flou en 1 passe au lieu de la pyramide
          downscale/upscale (plusieurs passes plein écran). Halo très légèrement
          plus serré, quasi imperceptible sur fond sombre. */}
      {/* seuil relevé (0.5→0.7) : le texte blanc des panneaux bloome moins → bords
          nets, mais les vraies sources lumineuses (rubis, lumière du fond) bloomment. */}
      <Bloom intensity={0.7} luminanceThreshold={0.7} luminanceSmoothing={0.9} />
      <Vignette eskil={false} offset={0.2} darkness={0.5} />
    </EffectComposer>
  )
}
