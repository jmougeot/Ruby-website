import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { createScrollMagnet } from './cave/scrollChoreography'
import { U_ARRIVE, U_HOLD, S_CAVE_END, S_MSG_HOLD, S_EXIT_HOLD } from './cave/config'
import RubyLoader from './RubyLoader'
import VideoControls from './VideoControls'
import { useWaitlist } from './Waitlist'
import { useI18n } from '../i18n'

const CaveScene = lazy(() => import('./CaveScene'))
const ease = [0.22, 1, 0.36, 1]

// debug : ?debug=lake (lac) ou ?debug=exit0.18 (remontée figée) fige la scène et
// masque les calques d'UI (image de repli, voile, texte, loader) → on voit la 3D
// brute (mise au point du décor / du raccord grotte↔cheminée).
const DEBUG_SCENE =
  typeof window !== 'undefined' && /debug=(lake|exit)/.test(window.location.search)
// ?capture : rendu déterministe + tous les calques d'UI masqués → utilisé par les
// scripts de capture d'écran (scripts/shot-at.mjs) pour shooter la 3D brute à une
// progression précise du voyage.
const CAPTURE = typeof window !== 'undefined' && window.location.search.includes('capture')
const HIDE_UI = DEBUG_SCENE || CAPTURE

/** Si la 3D plante (WebGL absent, etc.), on retombe sur l'image. */
class Safe3D extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function Hero() {
  const { t, locale } = useI18n()
  const { open } = useWaitlist()
  const reduce = useReducedMotion()
  // devant le 1er panneau : Ruby « travaille » → ces statuts défilent en boucle
  const analyzeMsgs = t('hero.analyze')
  // décidé SYNCHRONIQUEMENT au 1er rendu → la hauteur de section est stable,
  // pas de saut de scroll quand la 3D s'affiche ensuite
  const [use3D] = useState(() => {
    if (typeof window === 'undefined') return false
    // 3D activée aussi sur mobile ; on respecte juste « réduire les animations »
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [inView, setInView] = useState(true)
  const [docVisible, setDocVisible] = useState(true)
  const [ready, setReady] = useState(false) // 3D a rendu sa 1re image → ferme le loader
  const [start3D, setStart3D] = useState(false) // montage 3D retardé (cf. effet ci-dessous)
  // salut de Ruby (bas du hero) : 'off' → 'hello' (« Bonjour ») → 'follow' (« Suis-moi », cliquable)
  const [greet, setGreet] = useState('off')
  const [onVideo, setOnVideo] = useState(false) // on est sur la vidéo démo → bouton « Continuer »
  const [atPanel1, setAtPanel1] = useState(false) // devant le 1er panneau → statuts d'analyse en boucle
  const [atLake, setAtLake] = useState(false) // émergé sur le lac (fin) → bulle « Try it for free »
  const [analyzeIdx, setAnalyzeIdx] = useState(0) // statut courant qui défile
  const sectionRef = useRef(null)
  const overlayRef = useRef(null) // bloc titre (haut) — glisse vers le HAUT au scroll
  const inviteRef = useRef(null) // bulle de Ruby (bas) — s'efface au scroll
  const magnetRef = useRef(null) // aimant de scroll (clics « Suis-moi » / « Continuer »)
  const videoElRef = useRef(null) // <video> de l'écran démo (partagé par DemoScreen → barre de lecture)
  const onVideoRef = useRef(false) // miroir de onVideo lu dans la boucle de scroll (setState only on change)
  const atPanel1Ref = useRef(false) // miroir de atPanel1 lu dans la boucle de scroll
  const atLakeRef = useRef(false) // miroir de atLake lu dans la boucle de scroll
  const progress = useRef(0) // 0→1 sur toute la hauteur du hero (piloté par le scroll)

  // séquence du salut : à l'ouverture de la scène (ready), Ruby dit bonjour, puis
  // après quelques secondes propose « Suis-moi » (cliquable).
  useEffect(() => {
    if (!ready) return
    const hello = setTimeout(() => setGreet('hello'), 600)
    const follow = setTimeout(() => setGreet('follow'), 4200)
    return () => {
      clearTimeout(hello)
      clearTimeout(follow)
    }
  }, [ready])

  // devant le 1er panneau : les statuts d'analyse défilent en boucle tant qu'on y est.
  useEffect(() => {
    if (!atPanel1) return
    setAnalyzeIdx(0)
    const id = setInterval(() => setAnalyzeIdx((i) => (i + 1) % analyzeMsgs.length), 1600)
    return () => clearInterval(id)
  }, [atPanel1, analyzeMsgs.length])

  // clic « Suis-moi » → on glisse jusqu'à la vidéo démo (l'aimant fait le travail).
  const followRuby = () => magnetRef.current?.snapTo(U_ARRIVE)
  // clic « Break through » (sur la vidéo) → on poursuit : bris de l'écran + croisière
  // jusqu'au bout de grotte. Snap RAPIDE (vitesse haute + plafond de durée court) → le
  // bris est punchy, on ne traîne pas dans la transition.
  const continueJourney = () => magnetRef.current?.snapTo(S_CAVE_END, 1.0, 1500)

  // « Skip intro » → saut INSTANTANÉ au-delà de la cinématique (même méthode que le
  // header) : un scroll fluide se ferait rattraper par l'aimant. On atterrit sur la
  // 1re section lisible (#overview), à p≈1 où plus aucun palier n'est armé.
  const skipIntro = () => {
    const el = document.getElementById('overview')
    if (!el) return
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY)
    html.style.scrollBehavior = prev
  }

  // fige le rendu 3D dès que le hero sort de l'écran (gros gain de perf)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.01,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // fige aussi le rendu quand l'onglet n'est pas visible
  useEffect(() => {
    const onVis = () => setDocVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // DÉMARRAGE 3D RETARDÉ : le parse du gros chunk Three.js fige le thread
  // ~200-300 ms. On laisse d'abord le loader peindre et lancer son compteur sur
  // un thread libre, PUIS on monte CaveScene (déclenche l'import + le parse).
  // Coût : ~250 ms de chargement en plus, mais le départ du loader est lisse.
  useEffect(() => {
    const t = setTimeout(() => setStart3D(true), 250)
    return () => clearTimeout(t)
  }, [])

  // progression du scroll DANS le hero → pilote l'avancée du rubis (via progress
  // ref) + l'aimant multi-étapes (toute la dramaturgie est dans scrollChoreography).
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let raf = 0
    const magnet = createScrollMagnet({
      getTotal: () => el.offsetHeight - window.innerHeight,
      getOffsetTop: () => el.offsetTop,
    })
    magnetRef.current = magnet
    const update = () => {
      raf = 0
      const total = el.offsetHeight - window.innerHeight
      const p = total > 0 ? Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total)) : 0
      progress.current = p
      // le TITRE (en haut) glisse vers le HAUT et s'efface dès qu'on entre dans la grotte
      if (overlayRef.current) {
        const q = Math.min(1, Math.max(0, p / 0.1)) // 0→1 sur le tout début (≈1,5 écran)
        const up = q * window.innerHeight * 0.6 // glisse vers le haut, hors écran
        const fade = Math.min(1, Math.max(0, 1 - (q - 0.4) / 0.4))
        overlayRef.current.style.opacity = String(fade)
        overlayRef.current.style.transform = `translateY(${-up}px)`
        overlayRef.current.style.pointerEvents = q > 0.6 ? 'none' : 'auto'
      }
      // la bulle de Ruby (en bas) s'efface vite dès qu'on commence à avancer
      if (inviteRef.current) {
        const fade = 1 - Math.min(1, Math.max(0, p / 0.025))
        inviteRef.current.style.opacity = String(fade)
        inviteRef.current.style.pointerEvents = p > 0.008 ? 'none' : 'auto'
      }
      // « sur la vidéo » (pause plein cadre) → on propose le bouton « Continuer »
      const v = p > U_ARRIVE - 0.015 && p < U_HOLD + 0.01
      if (v !== onVideoRef.current) {
        onVideoRef.current = v
        setOnVideo(v)
      }
      // « devant le 1er panneau » (bout de grotte) → statuts d'analyse en boucle
      const a = p > S_CAVE_END - 0.012 && p < S_MSG_HOLD + 0.012
      if (a !== atPanel1Ref.current) {
        atPanel1Ref.current = a
        setAtPanel1(a)
      }
      // « sur le lac » (fin du voyage) → on propose la bulle « Try it for free »
      const lk = p > S_EXIT_HOLD
      if (lk !== atLakeRef.current) {
        atLakeRef.current = lk
        setAtLake(lk)
      }
      // aimant multi-étapes : happe vers le palier suivant (étapes/sens gérés dedans)
      magnet.maybeSnap(p)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
      magnet.trackVelocity()
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      magnet.dispose()
      magnetRef.current = null
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const y = reduce ? 0 : 18
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
  }
  const item = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
  }

  return (
    // section haute (3D) : la hauteur sert de "course" de scroll pour traverser
    // la grotte. Sans 3D (mobile/reduced-motion), hauteur d'écran normale.
    <section id="hero" ref={sectionRef} className={`relative w-full ${use3D ? 'h-[1490vh]' : 'h-svh min-h-[36rem]'}`}>
      {/* tout est épinglé à l'écran pendant qu'on défile la section */}
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/* image de repli UNIQUEMENT sans 3D (animations réduites). En 3D, le loader
            puis la scène couvrent tout l'écran → plus d'image qui transparaît. */}
        {!use3D && (
          <img
            src="/hero-cave.jpg"
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover ${reduce ? '' : 'kenburns'}`}
          />
        )}

        {/* grotte 3D par-dessus — montée APRÈS un court délai (start3D) pour
            laisser le loader démarrer son animation sur un thread libre. */}
        {use3D && start3D && (
          <Safe3D>
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <CaveScene
                  active={inView && docVisible}
                  scroll={progress}
                  locale={locale} // textes des cartes 3D (canvas) selon la langue
                  onReady={() => setReady(true)} // ferme le loader + lance le salut de Ruby
                  videoRef={videoElRef} // partage le <video> démo → barre de lecture
                />
              </div>
            </Suspense>
          </Safe3D>
        )}

        {/* écran de chargement classe (noir + ruby) tant que la 3D charge */}
        {use3D && !HIDE_UI && <RubyLoader ready={ready} />}

        {/* voile : sombre en haut (lisibilité header) + sombre en bas (texte) */}
        {!HIDE_UI && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0) 22%, rgba(8,8,10,0) 58%, rgba(8,8,10,0.5) 84%, rgba(11,11,13,0.92) 100%)',
          }}
        />
        )}

        {/* SKIP INTRO — échappatoire toujours visible pendant le voyage (le sales
            pressé / le visiteur de retour ne reste pas piégé dans les ~19 écrans de
            cinématique). Disparaît une fois émergé sur le lac (atLake). */}
        {use3D && !HIDE_UI && (
          <button
            type="button"
            onClick={skipIntro}
            className={`absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[12px] font-medium text-ink/80 backdrop-blur-md transition-opacity duration-500 hover:text-ink md:right-5 md:top-4 ${
              atLake ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            {t('hero.skip')}
          </button>
        )}

        {/* TITRE — ancré en HAUT, glisse vers le haut et s'efface au scroll */}
        <div
          ref={overlayRef}
          style={HIDE_UI ? { display: 'none' } : undefined}
          className="absolute inset-x-0 top-0 z-10 px-6 pt-28 md:pt-32"
        >
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto flex max-w-3xl flex-col items-center text-center"
          >
            <motion.h1
              variants={item}
              className="max-w-3xl text-balance text-[clamp(2.5rem,6.5vw,4.75rem)] font-medium leading-[1.05] tracking-tight"
            >
              {t('hero.title')}
            </motion.h1>

            {/* unique ligne évocatrice, lue À L'ARRÊT (en haut) → s'efface au scroll
                avec tout le bloc titre (overlayRef). La narration complète vit dans le
                bloc « pont » sous le hero (App.jsx). */}
            <motion.p variants={item} className="mt-6 max-w-md text-base leading-relaxed text-muted">
              {t('hero.subtitle')}
            </motion.p>

            <motion.div variants={item} className="mt-9">
              <button
                type="button"
                onClick={open}
                className="rounded-full bg-ink px-7 py-3.5 text-[15px] font-medium text-night shadow-[0_8px_30px_-8px_rgba(0,0,0,0.5)] transition-opacity hover:opacity-90"
              >
                {t('hero.cta')}
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* BULLE DE RUBY — ancrée en BAS, près du rubis 3D. Dit « Bonjour » puis
            propose « Suis-moi » (cliquable → glisse vers la vidéo démo). */}
        {use3D && !HIDE_UI && (
          <div
            ref={inviteRef}
            className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-12 md:pb-14"
          >
            <button
              type="button"
              onClick={greet === 'follow' ? followRuby : undefined}
              aria-live="polite"
              className={`speech-pill${greet !== 'off' ? ' is-in' : ''}${
                greet === 'follow' ? ' is-follow' : ''
              }`}
            >
              {greet === 'follow' && (
                <span className="pill-orb" aria-hidden="true">
                  <span className="pill-orb-spin" />
                </span>
              )}
              {greet === 'follow' ? t('hero.greetFollow') : t('hero.greetHello')}
            </button>
          </div>
        )}

        {/* SUR LA VIDÉO — le même bouton, version « Continuer » : poursuit le voyage
            (bris de l'écran + croisière jusqu'au bout de grotte). */}
        {use3D && !HIDE_UI && (
          <div
            className={`absolute inset-x-0 bottom-0 z-10 flex flex-row flex-wrap items-center justify-center gap-3 px-6 pb-12 transition-opacity duration-500 md:pb-14 ${
              onVideo ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {/* rendu SEULEMENT sur la vidéo → ne capte jamais le clic de « Suis-moi » */}
            {onVideo && (
              <>
                {/* barre de lecture (play/pause + seek) À CÔTÉ du bouton */}
                <VideoControls videoRef={videoElRef} visible={onVideo} />
                <button type="button" onClick={continueJourney} className="speech-pill is-in is-follow shrink-0">
                  <span className="pill-orb" aria-hidden="true">
                    <span className="pill-orb-spin" />
                  </span>
                  {t('hero.break')}
                </button>
              </>
            )}
          </div>
        )}

        {/* DEVANT LE 1er PANNEAU — Ruby « travaille » : statuts d'analyse en boucle. */}
        {use3D && !HIDE_UI && (
          <div
            className={`absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-12 transition-opacity duration-500 md:pb-14 ${
              atPanel1 ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <span className="speech-pill is-in" role="status" aria-live="polite">
              <span className="pill-orb" aria-hidden="true">
                <span className="pill-orb-spin" />
              </span>
              <span key={analyzeIdx} className="cycle-msg">
                {analyzeMsgs[analyzeIdx]}
              </span>
            </span>
          </div>
        )}

        {/* SUR LE LAC (fin) — petite bulle « Rejoindre la waitlist » : Ruby a mené jusqu'à
            la lumière, la bulle envoie passer à l'action (→ ouvre la modale waitlist). */}
        {use3D && !HIDE_UI && (
          <div
            className={`absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-12 transition-opacity duration-500 md:pb-14 ${
              atLake ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <button type="button" onClick={open} className="speech-pill is-in is-follow">
              <span className="pill-orb" aria-hidden="true">
                <span className="pill-orb-spin" />
              </span>
              {t('hero.lakeCta')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
