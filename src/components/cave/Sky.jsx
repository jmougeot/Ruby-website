import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LAKE_Y, smooth01 } from './config'

/** Ciel en DÉGRADÉ (dôme inversé) : horizon pâle chaud → zénith bleu profond.
 *  Non affecté par le fog (c'est LE ciel), fondu via l'opacité avec la sortie ;
 *  les crêtes lointaines délavées (haze) se raccordent à l'horizon → continuité. */
export function SkyDome({ exitRef, center, sunDir }) {
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
export function MountainClouds({ center, horizDir, side, exitRef }) {
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
