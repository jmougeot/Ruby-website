import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { U_END, LAKE_Y, smooth01 } from './config'
import { makeNormalTex, makeRockNormalTex } from './textures'

/** Terrain de MONTAGNE réel : un anneau (foothills près → hautes cimes au loin)
 *  déplacé verticalement par du bruit RIDGED multifractal → vraies arêtes,
 *  vallées et couloirs en 3D (et non une paroi cylindrique). Colorisation par
 *  altitude ET pente : forêt en bas → roche/éboulis → neige sur les sommets peu
 *  pentus, falaises rocheuses sur les faces raides. Le fog donne la perspective
 *  atmosphérique (les cimes lointaines se fondent dans le ciel). */
function MountainTerrain({ center, noise, baseY, sunDir }) {
  const geom = useMemo(() => {
    // azimut du soleil = axe du regard : on y plante LA grande montagne centrale
    // (qui cache le soleil) et on abaisse les flancs latéraux.
    const sunAngle = Math.atan2(sunDir.z, sunDir.x)
    // PERF : maille allégée (~58k→~28k tris). Les montagnes sont lointaines et
    // délavées par le fog/haze → la finesse perdue est invisible. Génération au
    // démarrage ~2× plus rapide (moins d'appels de bruit) → moins de à-coup au load.
    const RINGS = 150 // subdivisions radiales (proche → loin) — maille fine = grain
    const SEG = 520 // subdivisions angulaires (tour de l'horizon) — silhouette crispe
    const inner = 92 // rapprochées → la montagne LOOME plus grande dans le cadre
    const outer = 900 // chaîne profonde → étagement des crêtes lointaines
    const MAXH = 360 // chaîne d'ensemble plus BASSE → c'est le pic central qui domine

    const verts = new Float32Array((RINGS + 1) * SEG * 3)
    const heights = new Float32Array((RINGS + 1) * SEG)

    // hauteur du terrain en (x,z) : warp de domaine + ridged multifractal,
    // regroupé en MASSIFS par une enveloppe basse fréquence (vrais massifs
    // dominants séparés par des vallées, au lieu d'un bruit uniforme).
    const heightAt = (x, z, rt) => {
      // domaine déformé → arêtes sinueuses, pas de grille régulière
      const wf = 0.0055
      const wx = noise(x * wf, z * wf, 11.3)
      const wz = noise(x * wf + 5.2, z * wf - 3.1, 7.7)
      const px = x + wx * 55
      const pz = z + wz * 55
      // ridged multifractal → crêtes aiguës (la signature des montagnes).
      // 8 octaves, persistance haute (0.52) → arêtes franches qui se prolongent
      // sur plusieurs échelles (éperons + ravines), normalisé ~0..1.
      let ridge = 0
      let amp = 0.55
      let f = 0.0038
      let prev = 1
      let rsum = 0
      for (let o = 0; o < 8; o++) {
        let n = 1 - Math.abs(noise(px * f, pz * f, o * 1.7 + 0.5))
        n *= n
        n *= prev
        ridge += n * amp
        rsum += amp
        prev = THREE.MathUtils.clamp(n * 2.3, 0, 1)
        amp *= 0.52
        f *= 2.05
      }
      ridge /= rsum // 0..1
      // CREST : second champ ridged à plus HAUTE fréquence, dédié au haut du pic →
      // donne des dents/arêtes vives sur la SILHOUETTE (le cône lisse devient cassé).
      let crest = 0
      let ca = 0.55
      let cf = 0.0125
      let cp = 1
      let csum = 0
      for (let o = 0; o < 6; o++) {
        let n = 1 - Math.abs(noise(px * cf + 30.0, pz * cf - 18.0, o * 2.3 + 4.0))
        n *= n
        n *= cp
        crest += n * ca
        csum += ca
        cp = THREE.MathUtils.clamp(n * 2.1, 0, 1)
        ca *= 0.5
        cf *= 2.1
      }
      crest /= csum // 0..1
      // fbm → forme d'ensemble (masses, vallées larges)
      let fbm = 0
      let a2 = 0.5
      let f2 = 0.0038
      for (let o = 0; o < 5; o++) {
        fbm += noise(px * f2, pz * f2, o * 3.3) * a2
        a2 *= 0.5
        f2 *= 2.1
      }
      // enveloppe de MASSIF (très basse fréquence) : concentre la hauteur en
      // quelques grands massifs, vallées profondes entre eux → relief dramatique
      const mass = noise(px * 0.0013 + 10, pz * 0.0013 - 4, 2.5) * 0.5 + 0.5
      const massEnv = 0.3 + Math.pow(mass, 1.4) * 1.3
      // ENVELOPPE AZIMUTALE : écart angulaire au soleil (devant nous). Centre =
      // haut (grande montagne), flancs = bas → compo « pic central + reliefs latéraux ».
      const ang = Math.atan2(z, x)
      let da = ang - sunAngle
      da = Math.atan2(Math.sin(da), Math.cos(da)) // ramène dans [-π, π]
      // MASQUE D'UNE SEULE MONTAGNE : tout le relief est concentré dans le secteur
      // central (devant nous) ; PARTOUT AILLEURS le terrain plonge sous l'eau → il
      // ne reste QUE la grande montagne du milieu (plus de petites montagnes sur
      // les côtés, juste le lac autour).
      const broad = Math.exp(-(da * da) / (2 * 0.5 * 0.5))
      const central = Math.exp(-(da * da) / (2 * 0.34 * 0.34)) // LE pic dominant, condensé
      const field = (ridge * 1.0 + (fbm * 0.5 + 0.5) * 0.25) * massEnv
      // exposant modéré → les cimes s'élèvent déjà fort au mi-plan : elles
      // SURPLOMBENT la caméra (on lève la tête) tout en gardant du lac au 1er plan.
      const profile = Math.pow(rt, 1.1)
      // profil qui MONTE du rivage (rt 0.08) jusqu'au pic (rt 0.52) puis RESTE HAUT →
      // masse PLEINE et opaque (pas de trou). Les arêtes la rendent déchiquetée.
      const rise = THREE.MathUtils.smoothstep(rt, 0.08, 0.52)
      const cone = central * rise // 0..1 : masse lisse du pic central
      // SILHOUETTE DÉCHIQUETÉE : on MODULE la hauteur du pic par les arêtes
      // (ridge basse fréq = grands éperons, crest haute fréq = dents fines sur le
      // bord) au lieu d'un cône lisse → la crête se brise, des éperons saillent et
      // des couloirs/ravines plongent entre eux. C'est ça qui tue le look « flou ».
      const jag = 0.46 + ridge * 0.66 + crest * 0.3 // contraste fort, sans aiguilles
      const bigPeak = cone * (1480 * jag) - cone * (1 - ridge) * 210
      // corps + pic, masqués au centre ; hors du secteur central → −130 (sous l'eau)
      const land = (MAXH * field * profile + bigPeak) * broad - (1 - broad) * 130
      // GRAIN ROCHEUX : micro-relief ridged multi-échelle (ravines, arêtes,
      // éboulis, cassures). 6 octaves dont des fréquences fines → surface rocheuse
      // détaillée et non lisse. Amplitude forte (le pic est très grand).
      let det = 0
      let ad = 1
      let fd = 0.009
      let dsum = 0
      for (let o = 0; o < 6; o++) {
        det += (1 - Math.abs(noise(px * fd, pz * fd, o * 5.3 + 2.1))) * ad
        dsum += ad
        ad *= 0.52
        fd *= 2.1
      }
      // grain masqué au centre (pas de cailloux émergeant de l'eau) ET atténué au
      // SOMMET (rt>0.46) → plus d'aiguilles fines sur la cime, juste la roche.
      const grainFade =
        THREE.MathUtils.smoothstep(rt, 0.06, 0.42) * (1 - THREE.MathUtils.smoothstep(rt, 0.46, 0.56) * 0.6)
      const grain = (det / dsum - 0.42) * 62 * grainFade * broad
      // l'ourlet intérieur PLONGE sous l'eau → les montagnes émergent du lac
      // (au lieu de flotter) ; la ligne d'eau coupe naturellement les versants.
      const shore = THREE.MathUtils.lerp(-46, 0, THREE.MathUtils.smoothstep(rt, 0, 0.16))
      return land + grain + shore
    }

    const uvs = new Float32Array((RINGS + 1) * SEG * 2)
    for (let ri = 0; ri <= RINGS; ri++) {
      const rt = ri / RINGS
      const r = inner + (outer - inner) * rt
      for (let si = 0; si < SEG; si++) {
        const a = (si / SEG) * Math.PI * 2
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        const h = heightAt(x, z, rt)
        const idx = ri * SEG + si
        verts[idx * 3] = x
        verts[idx * 3 + 1] = h
        verts[idx * 3 + 2] = z
        heights[idx] = h
        // UV planaires (x,z) → la normal map de roche tuile sur le relief (détail
        // de surface fin). Étire un peu sur les faces raides = striures d'érosion.
        uvs[idx * 2] = x * 0.05
        uvs[idx * 2 + 1] = z * 0.05
      }
    }

    const indices = []
    for (let ri = 0; ri < RINGS; ri++) {
      for (let si = 0; si < SEG; si++) {
        const sn = (si + 1) % SEG
        const a = ri * SEG + si
        const b = ri * SEG + sn
        const c = (ri + 1) * SEG + si
        const d = (ri + 1) * SEG + sn
        indices.push(a, c, b, b, c, d)
      }
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    g.setIndex(indices)
    g.computeVertexNormals()

    // colorisation par altitude + pente (lue sur la normale calculée)
    const nrm = g.attributes.normal
    const count = nrm.count
    const colors = new Float32Array(count * 3)
    const grass = new THREE.Color('#5c7d39') // PRAIRIE vive au pied de la montagne
    const forest = new THREE.Color('#3d5a32') // versants boisés (au-dessus de l'herbe)
    const rockA = new THREE.Color('#6d7480') // roche froide
    const rockB = new THREE.Color('#897b6a') // roche chaude (strates) → variété
    const snow = new THREE.Color('#fbfdff') // neige (sommets) — quasi blanc pur
    const haze = new THREE.Color('#aecbe4') // brume d'horizon (perspective aérienne)
    const rock = new THREE.Color()
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const h = heights[i]
      const alt = THREE.MathUtils.clamp(h / 1650, 0, 1)
      // NB : les normales du terrain pointent vers le BAS (winding) → on flippe,
      // sinon la neige (smoothstep sur ny) restait toujours à 0 = aucune neige.
      const ny = -nrm.getY(i) // 1 = plat, →0 = paroi verticale
      const x = verts[i * 3]
      const z = verts[i * 3 + 2]
      const rad = Math.hypot(x, z)
      const rt = THREE.MathUtils.clamp((rad - inner) / (outer - inner), 0, 1)
      const ri = (i / SEG) | 0
      const si = i % SEG
      // teinte de roche VARIÉE (strates froides/chaudes) selon un bruit → grain d'albédo
      const strata = noise(x * 0.018, z * 0.018 + h * 0.01, 5.5) * 0.5 + 0.5
      rock.copy(rockA).lerp(rockB, strata)
      // ligne de neige irrégulière (bruit doux selon la position)
      const sl = 0.33 + noise(x * 0.01, z * 0.01, 3.7) * 0.11
      // base : HERBE sur tout le bas du versant → boisé → roche en haut
      c.copy(grass).lerp(forest, THREE.MathUtils.smoothstep(alt, 0.16, 0.4))
      c.lerp(rock, THREE.MathUtils.smoothstep(alt, 0.34, 0.64))
      // neige : altitude au-dessus de la ligne ET pente pas trop raide (tient mieux
      // → manteau neigeux plus présent sur les hauteurs, look « vraie montagne »).
      // Tolérance de pente élargie (0.24) → la neige accroche aussi les faces
      // assez raides en altitude = cime bien enneigée, pas juste grise.
      const snowAmt =
        THREE.MathUtils.smoothstep(alt, sl, sl + 0.1) *
        THREE.MathUtils.smoothstep(ny, 0.2, 0.55)
      c.lerp(snow, snowAmt)
      // falaises : faces très raides → roche nue même en altitude
      const cliff = THREE.MathUtils.smoothstep(1 - ny, 0.52, 0.74)
      c.lerp(rock, cliff * 0.65)
      // AMBIENT OCCLUSION par COURBURE : laplacien de la hauteur sur la grille →
      // les creux (ravines, vallées) s'assombrissent, les arêtes ressortent →
      // relief et grain bien plus lisibles (technique des meilleurs terrains).
      const up = heights[Math.min(RINGS, ri + 1) * SEG + si]
      const dn = heights[Math.max(0, ri - 1) * SEG + si]
      const lf = heights[ri * SEG + ((si + SEG - 1) % SEG)]
      const rgN = heights[ri * SEG + ((si + 1) % SEG)]
      const lap = h - (up + dn + lf + rgN) * 0.25
      // contraste AO renforcé (creux plus sombres, arêtes plus claires) → relief
      // beaucoup plus NET et lisible.
      const ao = THREE.MathUtils.clamp(0.5 + lap * 0.07, 0, 1)
      c.multiplyScalar(THREE.MathUtils.lerp(0.8, 1.25, ao))
      // mouchetage fin (variation de luminosité) → casse les aplats, donne du grain
      c.offsetHSL(0, 0, (noise(x * 0.09, z * 0.09, 13.2)) * 0.05)
      // PERSPECTIVE AÉRIENNE : les crêtes LOINTAINES se délavent vers la brume
      // bleutée (profondeur), mais le pic central (mi-plan) reste DENSE et opaque.
      // Réduite (0.46→0.28) → la montagne est plus NETTE, moins délavée de bleu.
      const hazeAmt = THREE.MathUtils.smoothstep(rt, 0.4, 1) * 0.28
      c.lerp(haze, hazeAmt)
      // RE-BLANCHIMENT : l'AO + la brume grisaient la neige → on la repousse vers
      // le blanc proportionnellement à snowAmt pour qu'elle reste éclatante.
      if (snowAmt > 0) c.lerp(snow, snowAmt * 0.55)
      colors[i * 3] = THREE.MathUtils.clamp(c.r, 0, 1)
      colors[i * 3 + 1] = THREE.MathUtils.clamp(c.g, 0, 1)
      colors[i * 3 + 2] = THREE.MathUtils.clamp(c.b, 0, 1)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    // ── SEMIS DE CONIFÈRES : on parcourt les sommets et on plante des arbres dans
    // la BANDE FORESTIÈRE (basse altitude, au-dessus de l'eau, pente douce, dans le
    // secteur central visible). Densité plus forte au centre, raréfaction vers la
    // ligne des arbres en haut → lisière naturelle. ~jusqu'à 2000 arbres instanciés.
    const trees = []
    const TREE_MAX = 650
    for (let i = 0; i < count && trees.length < TREE_MAX; i++) {
      const h = heights[i]
      if (h < 10) continue // au-dessus de l'eau
      const alt = h / 1650
      if (alt > 0.36) continue // sous la roche/neige → bande forestière
      // NB : les normales du terrain pointent vers le BAS (winding) → on flippe.
      const ny = -nrm.getY(i) // 1 = plat, →0 = paroi verticale
      if (ny < 0.12) continue // évite uniquement les vraies falaises verticales
      const x = verts[i * 3]
      const z = verts[i * 3 + 2]
      const ang = Math.atan2(z, x)
      let da = ang - sunAngle
      da = Math.atan2(Math.sin(da), Math.cos(da))
      const broad = Math.exp(-(da * da) / (2 * 0.5 * 0.5))
      if (broad < 0.45) continue // secteur central seulement (là où la terre émerge)
      // densité : dense en bas, se clairsème vers la lisière (ligne des arbres)
      const dens = broad * (1 - THREE.MathUtils.smoothstep(alt, 0.2, 0.36)) * 0.24
      if (Math.random() > dens) continue
      trees.push({
        x: x + (Math.random() - 0.5) * 9,
        y: h - 1,
        z: z + (Math.random() - 0.5) * 9,
        s: 1.0 + Math.random() * 1.1, // taille variée (plus petits)
        rot: Math.random() * Math.PI * 2,
        tint: 0.8 + Math.random() * 0.55, // variation de vert
      })
    }
    return { geometry: g, trees }
  }, [noise, sunDir])
  const geometry = geom.geometry
  const trees = geom.trees

  // layer 3 : ciblé par le soleil (qui n'éclaire QUE les montagnes, pas l'eau →
  // pas de reflet spéculaire du soleil au milieu du lac).
  const meshRef = useRef()
  useEffect(() => {
    meshRef.current?.layers.enable(3)
  }, [])
  // normal map de ROCHE (ridged) → relief de surface fin (strates, fissures) qui
  // accroche la lumière rasante → la montagne paraît rocheuse et non lisse.
  const rockNormal = useMemo(() => {
    const t = makeRockNormalTex(768)
    t.repeat.set(1, 1) // échelle portée par le triplanar (coords monde)
    return t
  }, [])
  // TRIPLANAR : on échantillonne la normal map selon les 3 plans du monde
  // (YZ, XZ, XY) et on mélange par la normale géométrique (« whiteout blend »,
  // Ben Golus). Résultat : AUCUN étirement de texture sur les faces verticales —
  // la roche garde un grain net partout, là où les UV planaires faisaient des
  // traînées verticales floues. Deux échelles superposées (macro fissures +
  // micro grain) → surface rocheuse riche de près comme de loin.
  const onBeforeCompile = useCallback((shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWNrm = mat3(modelMatrix) * objectNormal;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vWPos;
varying vec3 vWNrm;
// triplanar « whiteout blend » (Ben Golus) : aucune couture, aucun étirement
vec3 triNormal(sampler2D nmap, vec2 nScale, float s){
  vec3 triN = normalize(vWNrm);
  vec3 bl = pow(abs(triN), vec3(4.0));
  bl /= (bl.x + bl.y + bl.z);
  vec3 nx = texture2D(nmap, vWPos.zy * s).xyz * 2.0 - 1.0; nx.xy *= nScale;
  vec3 ny = texture2D(nmap, vWPos.xz * s).xyz * 2.0 - 1.0; ny.xy *= nScale;
  vec3 nz = texture2D(nmap, vWPos.xy * s).xyz * 2.0 - 1.0; nz.xy *= nScale;
  nx = vec3(nx.xy + triN.zy, abs(nx.z) * triN.x);
  ny = vec3(ny.xy + triN.xz, abs(ny.z) * triN.y);
  nz = vec3(nz.xy + triN.xy, abs(nz.z) * triN.z);
  return nx.zyx * bl.x + ny.xzy * bl.y + nz.xyz * bl.z;
}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `// deux échelles superposées : macro fissures + grain fin
vec3 wn = normalize(triNormal(normalMap, normalScale, 0.018) + triNormal(normalMap, normalScale, 0.07) * 0.6);
normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);`,
      )
  }, [])

  return (
    <group position={[center.x, baseY, center.z]}>
      <mesh ref={meshRef} geometry={geometry}>
        {/* DoubleSide nécessaire : l'ourlet intérieur plonge sous l'eau pour faire
            émerger les versants du lac ; en FrontSide ces faces immergées sont
            cullées → les montagnes semblent flotter. */}
        <meshStandardMaterial
          vertexColors
          roughness={0.97}
          metalness={0}
          normalMap={rockNormal}
          normalScale={[1.6, 1.6]}
          side={THREE.DoubleSide}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      {trees.length > 0 && (
        <Suspense fallback={null}>
          <Forest trees={trees} />
        </Suspense>
      )}
    </group>
  )
}

// modèle de sapin libre (CC0, Quaternius via Poly Pizza) — bien plus réaliste que
// des cônes. 1 mesh / 2 primitives (bois + feuillage), node scalé ×100 à la source.
const TREE_URL = '/models/PineTree.glb'

/** Forêt instanciée à partir du VRAI modèle 3D : on extrait chaque primitive du
 *  GLB (tronc + feuillage, chacune sa matière), on la normalise à 1 unité de haut
 *  (base à y=0), puis on rend un InstancedMesh par primitive — tous les arbres en
 *  2 draw calls, avec les vraies matières du modèle. Sur le layer 3 (éclairé par
 *  le soleil/contre-jour comme la montagne). */
function Forest({ trees }) {
  const { scene } = useGLTF(TREE_URL)
  const parts = useMemo(() => {
    scene.updateWorldMatrix(true, true)
    const out = []
    const box = new THREE.Box3()
    scene.traverse((o) => {
      if (!o.isMesh) return
      const g = o.geometry.clone()
      g.applyMatrix4(o.matrixWorld) // fige le scale ×100 du node dans la géométrie
      out.push({ geometry: g, material: o.material })
      g.computeBoundingBox()
      box.union(g.boundingBox)
    })
    // normalise : hauteur = 1, base posée sur y=0 → l'échelle d'instance = hauteur monde
    const k = 1 / Math.max(1e-3, box.max.y - box.min.y)
    out.forEach((p) => {
      p.geometry.scale(k, k, k)
      p.geometry.translate(0, -box.min.y * k, 0)
    })
    return out
  }, [scene])

  const groupRef = useRef()
  useEffect(() => {
    const grp = groupRef.current
    if (!grp) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scl = new THREE.Vector3()
    const yAxis = new THREE.Vector3(0, 1, 0)
    grp.children.forEach((mesh) => {
      mesh.layers.enable(3)
      trees.forEach((t, i) => {
        pos.set(t.x, t.y, t.z)
        q.setFromAxisAngle(yAxis, t.rot)
        const hgt = t.s * 9 // hauteur monde de l'arbre (modèle normalisé à 1)
        scl.set(hgt * (0.85 + Math.random() * 0.3), hgt, hgt * (0.85 + Math.random() * 0.3))
        m.compose(pos, q, scl)
        mesh.setMatrixAt(i, m)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.count = trees.length
    })
  }, [trees, parts])

  return (
    <group ref={groupRef}>
      {parts.map((p, i) => (
        <instancedMesh key={i} args={[p.geometry, p.material, trees.length]} frustumCulled={false} />
      ))}
    </group>
  )
}
useGLTF.preload(TREE_URL)

// Modèle d'oiseau animé (battement d'ailes morph) — exemple three.js, libre.
const BIRD_URL = '/models/Stork.glb'
// Correction d'orientation : aligne le « nez » du modèle sur le sens du vol.
const MODEL_YAW = Math.PI / 2

/** Un oiseau = une instance CLONÉE du modèle glTF, avec son propre mixer
 *  d'animation (battement déphasé/à vitesse propre) ; il décrit un large cercle
 *  au-dessus du lac, orienté dans le sens du vol et incliné légèrement (bank). */
function Bird({ data, center, exitRef }) {
  const group = useRef()
  const { scene, animations } = useGLTF(BIRD_URL)
  const model = useMemo(() => scene.clone(true), [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  // normalise l'envergure du modèle à 1 unité → scale lisible ensuite
  const norm = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const span = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z) || 1
    return 1 / span
  }, [scene])

  useEffect(() => {
    if (!animations.length) return undefined
    const action = mixer.clipAction(animations[0])
    action.play()
    action.time = Math.random() * (animations[0].duration || 1) // déphasage
    return () => mixer.stopAllAction()
  }, [mixer, animations])

  useFrame(({ clock }, delta) => {
    const g = group.current
    if (!g) return
    const ex = smooth01((exitRef.current - 0.5) / 0.5) // apparaissent en fin de sortie
    g.visible = ex > 0.001
    if (!g.visible) return
    mixer.update(delta * data.flapSpeed) // battement à vitesse propre
    const e = clock.elapsedTime
    const a = e * data.speed * data.dir + data.off
    g.position.set(
      center.x + Math.cos(a) * data.radius,
      LAKE_Y + data.height + Math.sin(e * 0.35 + data.off) * 4,
      center.z + Math.sin(a) * data.radius,
    )
    // cap = tangente du cercle ; léger roulis vers l'intérieur du virage
    const hx = -Math.sin(a) * data.dir
    const hz = Math.cos(a) * data.dir
    g.rotation.set(0, Math.atan2(-hz, hx), Math.sin(e * 0.6 + data.off) * 0.06)
    g.scale.setScalar(Math.max(0.0001, norm * data.size * ex))
  })

  return (
    <group ref={group} visible={false}>
      <primitive object={model} rotation={[0, MODEL_YAW, 0]} />
    </group>
  )
}

function Birds({ center, exitRef }) {
  const data = useMemo(() => {
    const arr = []
    for (let i = 0; i < 9; i++) {
      arr.push({
        radius: 90 + Math.random() * 160,
        height: 55 + Math.random() * 95,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 0.05 + Math.random() * 0.04,
        off: Math.random() * Math.PI * 2,
        flapSpeed: 0.8 + Math.random() * 0.6,
        size: 11 + Math.random() * 9, // envergure en unités monde
      })
    }
    return arr
  }, [])
  return (
    <group>
      {data.map((d, i) => (
        <Bird key={i} data={d} center={center} exitRef={exitRef} />
      ))}
    </group>
  )
}

// Oiseaux désactivés pour l'instant → on NE précharge PAS le modèle (économise le
// téléchargement + parse du .glb). Réactiver : remettre <Birds/> et ce preload.
// useGLTF.preload(BIRD_URL)

/** Ciel en DÉGRADÉ (dôme inversé) : horizon pâle chaud → zénith bleu profond.
 *  Non affecté par le fog (c'est LE ciel), fondu via l'opacité avec la sortie ;
 *  les crêtes lointaines délavées (haze) se raccordent à l'horizon → continuité. */
function SkyDome({ exitRef, center, sunDir }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        transparent: true,
        uniforms: {
          uHorizon: { value: new THREE.Color('#e7d4b6') }, // horizon chaud, hazy (golden hour)
          uZenith: { value: new THREE.Color('#3f6699') }, // bleu profond gardé en haut
          uGround: { value: new THREE.Color('#ab9c84') },
          uWarm: { value: new THREE.Color('#ffb152') }, // halo doré, plus chaud
          uHot: { value: new THREE.Color('#fff1d4') }, // cœur ardent du soleil
          uCloudLit: { value: new THREE.Color('#fce7cb') }, // bord du nuage éclairé (chaud)
          uCloudShade: { value: new THREE.Color('#6b7c92') }, // corps du nuage (froid)
          uSunDir: { value: new THREE.Vector3(sunDir.x, 0, sunDir.z).normalize() },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uCoverage: { value: 0.75 }, // 0 = ciel dégagé, 1 = couvert
          uCloudSpeed: { value: 2.0 }, // ← VITESSE des nuages (monte = plus rapide)
          uCamXZ: { value: new THREE.Vector2(center.x, center.z) }, // origine de la projection (≈ caméra au lac)
        },
        vertexShader: `varying vec3 vDir;
          void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vDir;
          uniform vec3 uHorizon, uZenith, uGround, uWarm, uHot, uCloudLit, uCloudShade, uSunDir;
          uniform float uOpacity, uTime, uCoverage, uCloudSpeed;
          uniform vec2 uCamXZ;
          float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p,p+34.345); return fract(p.x*p.y); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
          float fbm(vec2 p){ float v=0.0, a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
            for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }
          void main(){
            float h = vDir.y;
            // ── ciel : dégradé horizon chaud → zénith bleu, + sol sous l'horizon ──
            vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.62, h));
            col = mix(col, uGround, smoothstep(0.02, -0.25, h));
            // HALO SOLAIRE : le soleil est CACHÉ derrière le grand pic ; sa lueur
            // embrase le ciel autour de la cime (corona large + cœur ardent).
            vec3 hd = normalize(vec3(vDir.x, 0.0, vDir.z));
            float align = max(dot(hd, uSunDir), 0.0);
            float aboveHorizon = smoothstep(0.16, 0.34, h); // rien sous ~0.16 → eau propre
            float broadBand = 1.0 - smoothstep(0.1, 0.78, abs(h - 0.46));
            col = mix(col, uWarm, clamp(broadBand * aboveHorizon * pow(align, 1.5), 0.0, 1.0) * 0.85);
            float coreBand = 1.0 - smoothstep(0.0, 0.34, abs(h - 0.44));
            col = mix(col, uHot, clamp(coreBand * aboveHorizon * pow(align, 5.0), 0.0, 1.0) * 0.8);
            // ── NUAGES : couche projetée en PERSPECTIVE (volume + profondeur + flux vers nous) ──
            // Au lieu d'un dégradé PLAT sur le dôme, on projette le rayon de vue sur des PLANS
            // d'altitude (caméra → ciel) : l'horizon = LOIN (nuages petits, compressés), le zénith
            // = AU-DESSUS de nous (gros). Et on fait DÉRIVER le champ vers la caméra → les nuages
            // naissent à l'horizon, grossissent et passent au-dessus = ils « viennent vers nous ».
            float ts = uTime * uCloudSpeed;
            float cov = 1.0 - uCoverage;
            if (vDir.y > 0.02) {
              // PROJECTION : le rayon de vue rencontre le plan des nuages → l'horizon est
              // LOIN (dxz grand : nuages petits/serrés), le haut du ciel PROCHE (gros).
              vec2 dxz = vDir.xz / vDir.y;
              // FLUX en espace-monde : le champ avance VERS la caméra (sens du pic/soleil) →
              // via la perspective, les nuages NAISSENT bas, GROSSISSENT et montent = ils
              // « viennent vers nous » (vraie approche, pas un simple glissement latéral).
              vec2 flow = uSunDir.xz * (ts * 0.16) + vec2(ts * 0.03, 0.0);
              vec2 P = (uCamXZ + dxz * 260.0) * 0.0016 + flow;
              float w = fbm(P * 0.5); // domain warp → galbe « chou-fleur », pas des taches rondes
              float base = fbm(P + w * 0.7);
              // CHAMP UNIQUE (pas d'accumulation qui sature) → nuages DISTINCTS avec du ciel
              // entre eux, condition pour qu'on voie chacun s'approcher.
              float dens = smoothstep(cov, cov + 0.25, base);
              dens *= smoothstep(0.02, 0.13, vDir.y) * (1.0 - smoothstep(0.86, 1.0, vDir.y));
              // RÉTROÉCLAIRAGE (volume) : le soleil est DERRIÈRE les nuages → cœurs ÉPAIS sombres
              // (uCloudShade), bords FINS qui transmettent la lumière = liseré clair, DORÉ côté
              // soleil. Ce contraste cœur sombre / bord lumineux donne le relief (≠ tache plate).
              float thin = 1.0 - smoothstep(0.0, 0.5, dens);
              vec3 cc = mix(uCloudShade, uCloudLit, thin * 0.9);
              cc = mix(cc, uHot, thin * pow(align, 2.0) * 0.95); // liseré embrasé près du pic
              col = mix(col, cc, dens * 0.96);
            }
            gl_FragColor = vec4(col, uOpacity);
          }`,
      }),
    [sunDir],
  )
  useFrame(({ clock }) => {
    mat.uniforms.uOpacity.value = smooth01(exitRef.current)
    mat.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh material={mat} position={[center.x, LAKE_Y, center.z]} renderOrder={-1}>
      <sphereGeometry args={[1700, 32, 16]} />
    </mesh>
  )
}

/** Bouffée de nuage cotonneuse : quelques lobes flous superposés → alpha doux et
 *  irrégulier (silhouette de nuage, pas un disque). Blanc → teinté par le sprite. */
function makeCloudPuff() {
  const s = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const ctx = cv.getContext('2d')
  for (let i = 0; i < 7; i++) {
    const cx = s * (0.33 + Math.random() * 0.34)
    const cy = s * (0.4 + Math.random() * 0.24)
    const r = s * (0.16 + Math.random() * 0.16)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.34)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const t = new THREE.CanvasTexture(cv)
  t.needsUpdate = true
  return t
}

// altitude du sommet au-dessus du lac (la teinte du terrain normalise par ~1650) et
// distance horizontale du pic depuis le point de vue (≈ rt 0.5 sur l'anneau). Réglés
// pour que les nuages effleurent la POINTE visible — ajustables si besoin.
const SUMMIT = 1500
const PEAK_DIST = 470

/** Nuages 3D qui ENVELOPPENT le pic : chaque touffe ORBITE autour de l'axe vertical
 *  de la montagne. Près du sommet → petit rayon → elles frôlent la POINTE ; quand
 *  l'orbite les emmène derrière la crête, la montagne (opaque, depthTest) les MASQUE
 *  → elles disparaissent derrière puis ressortent = elles « contournent » la montagne.
 *  Contre-jour : cœur sombre (à l'ombre côté caméra) + halo doré (soleil derrière).
 *
 *  NB : on garde des SPRITES maison (et non les `<Clouds>`/`<Cloud>` volumétriques de
 *  drei) : ces derniers perdent le contexte WebGL sur le renderer headless ANGLE — et
 *  ce crash systématique trahit un risque réel sur certains GPU intégrés. Sprites = sûr. */
function MountainClouds({ center, horizDir, side, exitRef }) {
  const ref = useRef()
  const tex = useMemo(() => makeCloudPuff(), [])
  const peakX = center.x + horizDir.x * PEAK_DIST
  const peakZ = center.z + horizDir.z * PEAK_DIST
  const shade = useMemo(() => new THREE.Color('#3c4a5e'), []) // cœur à l'ombre (froid)
  const lit = useMemo(() => new THREE.Color('#e9d4b8'), []) // sommet éclairé (chaud)
  const gold = useMemo(() => new THREE.Color('#ffc98c'), []) // halo de contre-jour
  const clumps = useMemo(() => {
    const arr = []
    const N = 18
    for (let i = 0; i < N; i++) {
      const altF = 0.6 + Math.random() * 0.5 // 0.6 (flancs) → ~1.1 (au-dessus de la pointe)
      // haut = petit rayon (frôle la pointe) ; bas = large (le cône est plus gros)
      const R = THREE.MathUtils.lerp(400, 95, (altF - 0.6) / 0.5) + (Math.random() - 0.5) * 60
      const puffs = []
      const M = 4 + ((Math.random() * 3) | 0)
      const wide = 70 + Math.random() * 80 // touffes élargies (nuages lenticulaires de crête)
      for (let p = 0; p < M; p++) {
        const top = Math.random()
        const col = shade.clone().lerp(lit, top * 0.85)
        puffs.push({
          ox: (Math.random() - 0.5) * wide * 2.4,
          oy: (Math.random() - 0.5) * wide * 0.7,
          oz: (Math.random() - 0.5) * wide * 1.4,
          sx: wide * (1.5 + Math.random() * 0.9),
          sy: wide * (0.8 + Math.random() * 0.5),
          col,
          o: 0.5 + Math.random() * 0.3,
        })
      }
      arr.push({
        theta: Math.random() * Math.PI * 2,
        omega: (0.05 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : 1), // même sens (vent)
        R,
        altF,
        bob: Math.random() * Math.PI * 2,
        haloS: wide * 3.2,
        puffs,
      })
    }
    return arr
  }, [shade, lit])
  useFrame(({ clock }, delta) => {
    if (!ref.current) return
    const ex = smooth01((exitRef.current - 0.22) / 0.78)
    ref.current.visible = ex > 0.001
    if (!ref.current.visible) return
    const e = clock.elapsedTime
    clumps.forEach((c, i) => {
      c.theta += c.omega * delta
      const a = c.theta
      // orbite autour de l'axe vertical du pic : cos→côté (side), sin→profondeur (horizDir)
      const x = peakX + (Math.cos(a) * side.x + Math.sin(a) * horizDir.x) * c.R
      const z = peakZ + (Math.cos(a) * side.z + Math.sin(a) * horizDir.z) * c.R
      const y = LAKE_Y + SUMMIT * c.altF + Math.sin(e * 0.25 + c.bob) * 12
      const g = ref.current.children[i]
      g.position.set(x, y, z)
      g.children.forEach((s) => {
        s.material.opacity = (s.userData.o ?? 1) * ex
      })
    })
  })
  return (
    <group ref={ref} visible={false}>
      {clumps.map((c, i) => (
        <group key={i}>
          {/* halo de contre-jour (additif) DERRIÈRE les touffes → liseré doré aux bords */}
          <sprite renderOrder={1} scale={[c.haloS * 1.5, c.haloS, 1]} userData={{ o: 0.22 }}>
            <spriteMaterial
              map={tex}
              color={gold}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
          {/* corps du nuage : touffes sombres teintées (cœur à l'ombre → haut éclairé) */}
          {c.puffs.map((p, j) => (
            <sprite key={j} renderOrder={2} position={[p.ox, p.oy, p.oz]} scale={[p.sx, p.sy, 1]} userData={{ o: p.o }}>
              <spriteMaterial
                map={tex}
                color={p.col}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </sprite>
          ))}
        </group>
      ))}
    </group>
  )
}

/** Le lac : grande nappe d'eau calme à la surface (orientée vers le haut → on la
 *  perce en montant), terrain de montagne réaliste tout autour, oiseaux à
 *  l'arrivée, et la lumière du jour qui plonge dans la cheminée. Tout s'allume
 *  avec la sortie (exitRef) ; sinon le fog le masque. Le soleil est DERRIÈRE nous
 *  (hors champ) : il éclaire de face les montagnes et les oiseaux qu'on regarde. */
export function LakeScene({ curve, noise, exitRef }) {
  const END = useMemo(() => curve.getPointAt(U_END), [curve])
  const horizDir = useMemo(() => {
    const t = curve.getTangentAt(U_END).clone()
    t.y = 0
    return t.normalize()
  }, [curve])
  // CONTRE-JOUR : le soleil est DERRIÈRE les montagnes (loin devant nous, +horizDir)
  // et BAS → il rase la ligne de crête : rim-light chaud sur les arêtes, faces
  // tournées vers nous plongées dans l'ombre → silhouettes massives et sombres
  // contre un ciel lumineux = écrasement d'échelle maximal. Léger décalage latéral
  // pour des ombres obliques. Une 2e lumière FROIDE (ciel) remplit doucement les
  // faces à l'ombre côté caméra (sinon noir total → on perd le grain).
  const side = useMemo(() => new THREE.Vector3(-horizDir.z, 0, horizDir.x), [horizDir])
  const lightPos = useMemo(
    () =>
      new THREE.Vector3(END.x, LAKE_Y + 360, END.z)
        .addScaledVector(horizDir, 900) // haut derrière la chaîne
        .addScaledVector(side, 750), // bien décalé sur le côté → lumière RASANTE qui sculpte les faces visibles
    [END, horizDir, side],
  )
  const fillPos = useMemo(
    () =>
      new THREE.Vector3(END.x, LAKE_Y + 240, END.z)
        .addScaledVector(horizDir, -520) // depuis derrière la caméra → éclaire les faces ombrées
        .addScaledVector(side, -260),
    [END, horizDir, side],
  )
  const root = useRef()
  const sky = useRef()
  const sun = useRef()
  const fill = useRef()
  const shaft = useRef()
  // SOLEIL (clé chaude) ET remplissage froid n'agissent que sur le layer 3 = les
  // montagnes. L'eau (layer 0) ne reçoit AUCUNE de ces directionnelles → zéro
  // reflet spéculaire au milieu du lac (une directional light ignore l'occlusion
  // du pic). L'eau n'est éclairée que par l'hémisphère (doux, diffus).
  useEffect(() => {
    sun.current?.layers.set(3)
    fill.current?.layers.set(3)
  }, [])

  const geom = useMemo(() => new THREE.PlaneGeometry(1400, 1400, 1, 1), [])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  const normalA = useMemo(() => {
    const t = makeNormalTex(256, 4, 1.0, 1.3)
    t.repeat.set(70, 70)
    return t
  }, [])
  const normalB = useMemo(() => {
    const t = makeNormalTex(256, 4, 1.6, 1.0)
    t.repeat.set(130, 130)
    return t
  }, [])
  const onBeforeCompile = useCallback(
    (shader) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3( position );
transformed.z += sin(position.x*0.04 + uTime*0.4)*0.5 + sin(position.y*0.05 - uTime*0.3)*0.4;`,
        )
    },
    [uniforms],
  )

  useFrame((_, delta) => {
    // PERF : toute la scène du lac (montagnes ~58k tris, ciel, oiseaux, brume) n'est
    // RENDUE que pendant la sortie. Dans la grotte (exit≈0) le fog la masque de toute
    // façon → on la retire du rendu. Le seuil bas est invisible (tout est encore noir).
    if (root.current) root.current.visible = exitRef.current > 0.002
    const s = smooth01((exitRef.current - 0.2) / 0.8)
    if (sky.current) sky.current.intensity = 3.8 * s // ciel diffus relevé → bas plus lisible
    if (sun.current) sun.current.intensity = 8.2 * s // contre-jour chaud FORT (rim-light)
    if (fill.current) fill.current.intensity = 6.5 * s // remplissage froid des ombres (camera-facing)
    if (shaft.current) shaft.current.intensity = 240 * s
    uniforms.uTime.value += delta
    normalA.offset.x += delta * 0.006
    normalA.offset.y += delta * 0.004
    normalB.offset.x -= delta * 0.005
    normalB.offset.y += delta * 0.0065
  })

  return (
    <group ref={root} visible={false}>
      {/* ciel : dégradé + halo solaire + NUAGES volumétriques (fbm) dans le shader du dôme */}
      <SkyDome exitRef={exitRef} center={END} sunDir={horizDir} />
      {/* surface du lac : plan orienté vers le haut → invisible vu de dessous (on
          perce la surface en remontant), nappe d'eau visible une fois émergé */}
      <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[END.x, LAKE_Y, END.z]}>
        {/* lac : bleu-sarcelle clair et plus réfléchissant → l'eau se LIT bien (reflet
            doux du ciel/environnement) sans pour autant renvoyer un point chaud du
            soleil (le soleil reste sur le layer 3, pas sur l'eau). */}
        <meshPhysicalMaterial
          color="#33617a"
          roughness={0.34}
          metalness={0}
          clearcoat={0.3}
          clearcoatRoughness={0.45}
          envMapIntensity={0.9}
          normalMap={normalA}
          normalScale={[0.12, 0.12]}
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
      {/* chaîne de montagnes 3D réaliste tout autour de l'horizon (base = niveau
          du lac → l'ourlet submergé fait émerger les versants de l'eau) */}
      <MountainTerrain center={END} noise={noise} baseY={LAKE_Y} sunDir={horizDir} />
      {/* nuages 3D qui ENVELOPPENT le pic et frôlent la pointe (orbite + occlusion par la montagne) */}
      <MountainClouds center={END} horizDir={horizDir} side={side} exitRef={exitRef} />
      {/* (MistBand retiré : ses sprites blancs non-tonemappés faisaient une tache
          lumineuse au milieu du lac + voilaient le bas de la montagne) */}
      {/* oiseaux : retirés pour l'instant (perf — meshes skinnés animés) */}
      {/* lumière du jour DANS la cheminée : portée volontairement courte (34) depuis
          LAKE_Y−40 → atteint au plus y≈−6, BIEN sous la surface (LAKE_Y) → elle
          n'éclaire plus du tout le centre du lac. */}
      <pointLight ref={shaft} color="#cfe6ff" intensity={0} distance={34} decay={1.7} position={[END.x, LAKE_Y - 40, END.z]} />
      <hemisphereLight ref={sky} args={['#dcebff', '#3c4f5c', 0]} />
      {/* CONTRE-JOUR chaud derrière la chaîne (rim-light) + remplissage froid des ombres */}
      <directionalLight ref={sun} color="#ffb56e" intensity={0} position={lightPos.toArray()} />
      <directionalLight ref={fill} color="#93b4dc" intensity={0} position={fillPos.toArray()} />
    </group>
  )
}
