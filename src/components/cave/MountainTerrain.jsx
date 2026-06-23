import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { makeRockNormalTex } from './textures'

/** Terrain de MONTAGNE réel : un anneau (foothills près → hautes cimes au loin)
 *  déplacé verticalement par du bruit RIDGED multifractal → vraies arêtes,
 *  vallées et couloirs en 3D (et non une paroi cylindrique). Colorisation par
 *  altitude ET pente : forêt en bas → roche/éboulis → neige sur les sommets peu
 *  pentus, falaises rocheuses sur les faces raides. Le fog donne la perspective
 *  atmosphérique (les cimes lointaines se fondent dans le ciel). */
export function MountainTerrain({ center, noise, baseY, sunDir }) {
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
    // 512 (et NON 768) : DOIT matcher la taille demandée par CaveScene → même clé de
    // cache, le bruit n'est calculé qu'une fois et partagé entre grotte et montagnes.
    const t = makeRockNormalTex(512)
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
// GLB NON compressé : un seul petit modèle (~93 Ko) → pas la peine de charger le
// décodeur Draco (wasm depuis le CDN gstatic) au 1er rendu juste pour lui.
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
