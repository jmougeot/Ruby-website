import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { U_END, LAKE_Y, EXIT_HOLD } from './config'
import { caveReadPose, exitChoreography } from './caveGeometry'
import { translate } from '../../i18n'

// ─────────────────────────────────────────────────────────────────────────────
// KEYNOTE CARDS — panneaux « verre dépoli » premium (façon Apple) posés DANS la
// scène 3D. Toute la carte est dessinée sur un canvas haute résolution (verre fumé,
// bordure hairline, sheen, ombre portée, point accent rubis, titre dégradé,
// proof-point) → texte net + vrai look UI, sans police 3D à bundler. Chaque carte
// flotte face caméra et entre en fondu/échelle sur son palier de scroll.
// ─────────────────────────────────────────────────────────────────────────────
const CARD_ASPECT = 16 / 9
const clamp01 = (x) => THREE.MathUtils.clamp(x, 0, 1)

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Découpe un paragraphe en lignes qui tiennent dans maxWidth (police déjà posée
 *  sur ctx). Mots insécables : un mot plus long que maxWidth déborde plutôt que
 *  d'être coupé (jamais le cas ici). */
function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawCard(ctx, W, H, { kicker, title, body }) {
  ctx.clearRect(0, 0, W, H)
  const m = 84 // marge réservée à l'ombre/glow
  const x = m
  const y = m
  const w = W - 2 * m
  const h = H - 2 * m
  const r = 104 // coins très arrondis → galet de verre « liquid glass »
  const cx = W / 2

  // ── corps verre givré + ombre portée (la carte flotte, détachée du décor) ──
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 90
  ctx.shadowOffsetY = 34
  const base = ctx.createLinearGradient(0, y, 0, y + h)
  base.addColorStop(0, 'rgba(36,44,60,0.50)') // plus translucide/givré en haut
  base.addColorStop(0.5, 'rgba(18,23,33,0.46)')
  base.addColorStop(1, 'rgba(10,13,20,0.58)')
  ctx.fillStyle = base
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.restore()

  // ── travail de lumière, CLIPPÉ à l'intérieur du verre ──
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  // lumière diffuse venant du haut (verre dépoli éclairé par le dessus)
  const topGlow = ctx.createRadialGradient(cx, y, 0, cx, y, w * 0.72)
  topGlow.addColorStop(0, 'rgba(200,225,255,0.16)')
  topGlow.addColorStop(1, 'rgba(200,225,255,0)')
  ctx.fillStyle = topGlow
  ctx.fillRect(x, y, w, h)
  // gloss spéculaire : large bande diagonale douce
  const streak = ctx.createLinearGradient(x, y, x + w, y + h)
  streak.addColorStop(0.3, 'rgba(255,255,255,0)')
  streak.addColorStop(0.46, 'rgba(255,255,255,0.10)')
  streak.addColorStop(0.5, 'rgba(255,255,255,0.16)')
  streak.addColorStop(0.54, 'rgba(255,255,255,0.10)')
  streak.addColorStop(0.7, 'rgba(255,255,255,0)')
  ctx.fillStyle = streak
  ctx.fillRect(x, y, w, h)
  // ombre interne en bas → épaisseur/poids du verre
  const innerShade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h)
  innerShade.addColorStop(0, 'rgba(0,0,8,0)')
  innerShade.addColorStop(1, 'rgba(0,0,10,0.40)')
  ctx.fillStyle = innerShade
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45)
  ctx.restore()

  // ── EDGE LENSING : le bord réfracte la lumière (signature liquid glass) ──
  // 1) halo intérieur clair le long du bord (flouté, clippé dedans)
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  const rim = ctx.createLinearGradient(0, y, 0, y + h)
  rim.addColorStop(0, 'rgba(255,255,255,0.55)')
  rim.addColorStop(0.45, 'rgba(255,255,255,0.06)')
  rim.addColorStop(1, 'rgba(176,206,255,0.26)') // bas bleuté = lumière réfractée
  ctx.strokeStyle = rim
  ctx.lineWidth = 9
  ctx.shadowColor = 'rgba(255,255,255,0.45)'
  ctx.shadowBlur = 16
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, r - 5)
  ctx.stroke()
  ctx.restore()
  // 2) hairline net pile sur l'arête (clair en haut → discret en bas)
  const edge = ctx.createLinearGradient(0, y, 0, y + h)
  edge.addColorStop(0, 'rgba(255,255,255,0.92)')
  edge.addColorStop(0.5, 'rgba(255,255,255,0.28)')
  edge.addColorStop(1, 'rgba(255,255,255,0.14)')
  ctx.strokeStyle = edge
  ctx.lineWidth = 2.5
  roundRect(ctx, x + 1.25, y + 1.25, w - 2.5, h - 2.5, r - 1.25)
  ctx.stroke()
  // 3) frange chromatique très subtile (réfraction « liquide » du bord)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(120,200,255,0.16)' // cyan
  roundRect(ctx, x + 2.5, y + 3.5, w - 5, h - 7, r - 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,120,170,0.12)' // magenta, légèrement décalé
  roundRect(ctx, x + 3.5, y + 1.5, w - 7, h - 3, r - 3)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // ── kicker = étape : point rubis + libellé en capitales tracké ──
  const kickY = y + h * 0.17
  ctx.font = '600 32px Geist, Inter, sans-serif'
  ctx.letterSpacing = '8px'
  const ku = kicker.toUpperCase()
  const kickW = ctx.measureText(ku).width
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.fillText(ku, cx + 14, kickY) // léger offset → place pour le point
  ctx.save()
  ctx.fillStyle = '#ff4d5a'
  ctx.shadowColor = 'rgba(255,77,90,0.85)'
  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(cx - kickW / 2 - 4, kickY, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.letterSpacing = '0px'

  // ── accroche : 1-2 lignes, dégradé blanc → bleu froid, tracking serré ──
  const lines = Array.isArray(title) ? title : [title]
  const tSize = lines.length > 1 ? 116 : 132
  const grad = ctx.createLinearGradient(0, y + h * 0.26, 0, y + h * 0.52)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(1, '#c9d8f2')
  ctx.fillStyle = grad
  ctx.font = `600 ${tSize}px Geist, Inter, sans-serif`
  ctx.letterSpacing = '-2px'
  const lh = tSize * 1.06
  const tStart = y + h * 0.39 - ((lines.length - 1) * lh) / 2
  lines.forEach((ln, i) => ctx.fillText(ln, cx, tStart + i * lh))
  ctx.letterSpacing = '0px'

  // ── corps : paragraphe avec retour à la ligne auto, centré sous l'accroche ──
  const bodySize = 46
  ctx.font = `400 ${bodySize}px Inter, Geist, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  const blh = bodySize * 1.34
  const bodyLines = wrapText(ctx, body, w * 0.8)
  const bStart = y + h * 0.7 - ((bodyLines.length - 1) * blh) / 2
  bodyLines.forEach((ln, i) => ctx.fillText(ln, cx, bStart + i * blh))
}

/** Texture canvas haute résolution de la carte. Redessine quand Geist est prête
 *  (sinon la 1re frame tombe sur la police de repli). */
function useCardTexture(content) {
  const tex = useMemo(() => {
    // dessin AUTEUR en coordonnées base (2048) ; raster à base×DPR (→ 4096 sur
    // Retina) pour suivre le framebuffer monté à 2× → texte piqué même quand la
    // carte occupe une grande part de l'écran. Sur écran DPR 1 → reste 2048.
    const BASE_W = 2048
    const BASE_H = Math.round(BASE_W / CARD_ASPECT)
    const scale = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2)
    const cv = document.createElement('canvas')
    cv.width = BASE_W * scale
    cv.height = BASE_H * scale
    const ctx = cv.getContext('2d')
    ctx.scale(scale, scale) // tout drawCard reste écrit pour 2048×1152
    const t = new THREE.CanvasTexture(cv)
    t.anisotropy = 16
    t.colorSpace = THREE.SRGBColorSpace
    const render = () => {
      drawCard(ctx, BASE_W, BASE_H, content)
      t.needsUpdate = true
    }
    render()
    if (typeof document !== 'undefined' && document.fonts?.load) {
      Promise.all([document.fonts.load('600 142px Geist'), document.fonts.load('500 44px Geist')])
        .then(render)
        .catch(() => {})
    }
    return t
    // redessine quand le CONTENU change (bascule de langue) → la signature couvre
    // kicker + titre (tableau) + proof-point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(content)])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

/** Mesh commun : un plan texturé, self-lit (toneMapped off → net, indépendant de
 *  l'éclairage grotte). Le parent pilote l'opacité (matRef) et scale/pos (groupe). */
function CardPlane({ groupRef, matRef, tex, w, h }) {
  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

const W1 = 26
const H1 = W1 / CARD_ASPECT
const CAVE_CARD_DIST = 26 // distance de la carte 1 DEVANT la caméra, le long de son axe de visée → tient entière dans le cadre

/** Carte 1 — bout de grotte (pose A) : posée PILE sur l'axe de visée de la caméra
 *  figée (cf. caveReadPose), à distance fixe devant elle → parfaitement centrée à
 *  l'écran. Billboard chaque frame (reste droite sous la parallaxe souris). Apparaît
 *  à l'arrivée (uRef→U_END), s'efface dès que la remontée démarre. */
function CaveBeat({ curve, uRef, exitRef, locale }) {
  const group = useRef()
  const mat = useRef()
  const tex = useCardTexture({
    kicker: translate(locale, 'cards.1.kicker'),
    title: translate(locale, 'cards.1.title'),
    body: translate(locale, 'cards.1.body'),
  })
  // point MONDE fixe : sur l'axe de visée de la caméra (pose A), à CAVE_CARD_DIST
  // devant elle → centré écran, et assez loin pour tenir entier dans le cadre.
  const anchor = useMemo(() => {
    const { pos, forward } = caveReadPose(curve)
    return pos.clone().addScaledVector(forward, CAVE_CARD_DIST)
  }, [curve])

  useFrame(({ camera, clock }) => {
    if (!mat.current || !group.current) return
    const appear = clamp01((uRef.current - (U_END - 0.02)) / 0.015)
    const leave = 1 - clamp01(exitRef.current * 3)
    const presence = appear * leave
    mat.current.opacity = presence
    mat.current.visible = presence > 0.005
    if (!mat.current.visible) return
    group.current.position.copy(anchor)
    group.current.position.y = anchor.y + Math.sin(clock.elapsedTime * 0.6) * 0.18 // respiration douce, sans casser le centrage
    group.current.scale.setScalar(0.96 + 0.04 * presence)
    group.current.lookAt(camera.position) // pile face caméra (billboard ; caméra ~figée sur pose A)
  })

  return <CardPlane groupRef={group} matRef={mat} tex={tex} w={W1} h={H1} />
}

/** Carte 2 — palier dans le puits (pose B) : ancrée au point monde visé par la
 *  caméra, billboard. Apparaît/tient sur la pause de lecture (EXIT_HOLD). */
function ExitBeat({ curve, exitRef, locale }) {
  const group = useRef()
  const mat = useRef()
  const tex = useCardTexture({
    kicker: translate(locale, 'cards.2.kicker'),
    title: translate(locale, 'cards.2.title'),
    body: translate(locale, 'cards.2.body'),
  })
  const pos = useMemo(() => exitChoreography(curve).msg, [curve])

  useFrame(({ camera }) => {
    if (!mat.current || !group.current) return
    const ex = clamp01(exitRef.current)
    const appear = clamp01((ex - EXIT_HOLD * 0.45) / (EXIT_HOLD * 0.45))
    const leave = 1 - clamp01((ex - (EXIT_HOLD + 0.1)) / 0.14)
    const presence = appear * leave
    mat.current.opacity = presence
    mat.current.visible = presence > 0.005
    if (!mat.current.visible) return
    group.current.position.copy(pos)
    group.current.scale.setScalar(0.96 + 0.04 * presence)
    group.current.lookAt(camera.position) // billboard
  })

  return <CardPlane groupRef={group} matRef={mat} tex={tex} w={W1} h={H1} />
}

const W3 = 128
const H3 = W3 / CARD_ASPECT

/** Carte 3 — AU MILIEU DE LA MONTAGNE : petit panneau posé sur la face de la montagne,
 *  centré, billboard. N'apparaît qu'une fois bien sorti sur le lac (exit→1). */
function LakeBeat({ curve, exitRef, locale }) {
  const group = useRef()
  const mat = useRef()
  const tex = useCardTexture({
    kicker: translate(locale, 'cards.3.kicker'),
    title: translate(locale, 'cards.3.title'),
    body: translate(locale, 'cards.3.body'),
  })
  const pos = useMemo(() => {
    const end = curve.getPointAt(U_END)
    const t = curve.getTangentAt(U_END).clone()
    t.y = 0
    t.normalize()
    // haut et en avant vers la montagne → posé à mi-hauteur sur sa face, centré
    // (dans le champ de la caméra qui regarde les cimes une fois sur le lac).
    return new THREE.Vector3(end.x, LAKE_Y + 75, end.z).addScaledVector(t, 120)
  }, [curve])

  useFrame(({ camera, clock }) => {
    if (!mat.current || !group.current) return
    const presence = clamp01((exitRef.current - 0.82) / 0.16)
    mat.current.opacity = presence
    mat.current.visible = presence > 0.005
    if (!mat.current.visible) return
    group.current.position.copy(pos)
    group.current.position.y = pos.y + Math.sin(clock.elapsedTime * 0.5) * 0.4
    group.current.scale.setScalar(0.97 + 0.03 * presence)
    group.current.lookAt(camera.position) // billboard
  })

  return <CardPlane groupRef={group} matRef={mat} tex={tex} w={W3} h={H3} />
}

/** Les 3 cartes keynote de la traversée (bout de grotte → puits → lac). */
export function KeynoteCards({ curve, uRef, exitRef, locale = 'en' }) {
  return (
    <>
      <CaveBeat curve={curve} uRef={uRef} exitRef={exitRef} locale={locale} />
      <ExitBeat curve={curve} exitRef={exitRef} locale={locale} />
      <LakeBeat curve={curve} exitRef={exitRef} locale={locale} />
    </>
  )
}
