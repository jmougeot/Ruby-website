// ─────────────────────────────────────────────────────────────────────────────
// PROFIL D'APPAREIL — fichier PUR (AUCUN import `three`, cf. config.js).
//
// Curseurs de coût GPU de la scène 3D. Il n'y a plus qu'UN profil : sur téléphone
// la 3D ne monte jamais (le hero est remplacé par MobileHero, cf. App.jsx), donc
// l'ancien profil « mobile allégé » (DPR/textures/MSAA réduits) a été supprimé.
// La 3D ne tourne que sur desktop/tablette → rendu net partout ; la qualité
// adaptative (PerformanceMonitor dans CaveScene) reste le seul garde-fou.
// ─────────────────────────────────────────────────────────────────────────────

// Uniquement des NOMBRES/booléens (fichier pur) ; chaque fichier 3D lit son curseur.
const PROFILE = {
  dprCap: 2,
  envResolution: 128,
  multisampling: 4,
  cardDprCap: 2, // résolution des textures canvas des cartes keynote (KeynoteCards)
  waterClearcoat: true, // vernis clearcoat sur l'eau — quasi double le coût de shading des plans d'eau
  tubeSegments: 480, // TubeGeometry des parois (tubulaire × radial)
  tubeRadial: 32,
  waterSegments: 80, // maille de la nappe d'eau de la grotte (houle en vertex shader)
  mountainRings: 100, // maille de la montagne du lac (rings × segs ; ~64k tris —
  mountainSegs: 320, // l'ancienne 150×520 = 156k tris, invisible de loin sous le fog/haze)
  treeMax: 650, // forêt instanciée (2 draw calls quel que soit le nombre)
  cloudClumps: 18, // touffes de nuages (≈ 6 sprites transparents chacune → overdraw)
}

export function getDeviceProfile() {
  return PROFILE
}
