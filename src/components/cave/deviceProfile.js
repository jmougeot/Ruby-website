// ─────────────────────────────────────────────────────────────────────────────
// PROFIL D'APPAREIL — fichier PUR (AUCUN import `three`, cf. config.js).
//
// Décide, au 1er rendu CLIENT, si on sert le rendu 3D « desktop » (net) ou une
// version ALLÉGÉE pour téléphone (moins de pixels, textures plus petites, pas de
// MSAA sur le composer). La cinématique reste la même — seuls les curseurs de coût
// GPU changent, pour tenir le framerate sur un GPU mobile sans chauffer/vider la
// batterie.
//
// SSR : `typeof window` absent → profil DESKTOP par défaut, cohérent avec le prérendu
// EN de la home (aucune 3D n'y tourne de toute façon). La détection est synchrone,
// donc `CaveScene` la lit une fois au montage, comme `use3D` dans Hero.
// ─────────────────────────────────────────────────────────────────────────────

// Téléphone = pointeur grossier (doigt) ET petit viewport. On EXCLUT volontairement
// les tablettes larges (≥768) : elles ont un GPU suffisant et bénéficient du rendu net.
export function isMobileDevice() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarse && window.innerWidth < 768
}

// Curseurs de coût GPU. Point de départ raisonnable — à affiner sur device réel.
const DESKTOP = { isMobile: false, dprCap: 2, envResolution: 128, texSize: 512, multisampling: 4 }
const MOBILE = { isMobile: true, dprCap: 1.5, envResolution: 64, texSize: 384, multisampling: 0 }

export function getDeviceProfile() {
  return isMobileDevice() ? MOBILE : DESKTOP
}
